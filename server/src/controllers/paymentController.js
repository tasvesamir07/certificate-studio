const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const pool = require("../models/db");
const { pendingEmailJobs, sendEmailBatch, pendingPurchaseJobs } = require("./certController");
const { createTransporter } = require("../services/mailer");

const ACCESS_PERIOD_DAYS = 30;
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

const getClientBaseUrl = (req) => {
  const envUrl = process.env.CLIENT_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const host = req.get("host") || "localhost:5000";
  const protocol = req.protocol || "http";
  if (host.includes(":5000") || host.endsWith(":5000")) {
    return `${protocol}://localhost:3000`;
  }
  return `${protocol}://${host}`;
};

const getServerBaseUrl = (req) => {
  const host = req.get("host") || "localhost:5000";
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${host}`).replace(/\/$/, "");
};

const getTranIdFromRequest = (req) => req.body?.tran_id || req.query?.tran_id || "";

const redirectWithMessage = (res, url, message = "Redirecting...") => {
  const safeUrl = url || "/";
  const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  res.status(200).send(
    `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta http-equiv="refresh" content="0;url=${safeUrl}" /><script>window.location.href=${JSON.stringify(safeUrl)};</script></head><body><p>${safeMessage}</p></body></html>`
  );
};

const generateRandomPassword = () => uuidv4().slice(0, 8);

const completePurchaseAfterPayment = async (tranId) => {
  const pending = pendingPurchaseJobs.get(tranId);
  if (!pending) {
    return { error: { status: 404, message: "No pending purchase found for this transaction." } };
  }

  const { email, name, days } = pending;
  const client = await pool.connect();
  const displayName = (name || email || "").split("@")[0] || "Member";
  const durationDays = parseInt(days, 10) || ACCESS_PERIOD_DAYS;
  let newExpiresAt = new Date();
  let isNewUser = false;
  let tempPassword = null;

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT u.id, ua.access_expires_at FROM users u LEFT JOIN user_access ua ON u.id = ua.user_id WHERE u.email = $1`,
      [email]
    );

    let userId = userResult.rows[0]?.id;

    if (userId && userResult.rows[0]?.access_expires_at) {
      const currentExpiry = new Date(userResult.rows[0].access_expires_at);
      if (currentExpiry > new Date()) {
        newExpiresAt = currentExpiry;
      }
    }

    newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);

    if (!userId) {
      isNewUser = true;
      tempPassword = generateRandomPassword();
      const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);
      const newUserResult = await client.query(
        `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id`,
        [email, passwordHash, displayName]
      );
      userId = newUserResult.rows[0].id;
    }

    await client.query(
      `INSERT INTO user_access (user_id, access_expires_at, last_renewal_date, is_active)
       VALUES ($1, $2, NOW(), TRUE)
       ON CONFLICT (user_id) DO UPDATE SET access_expires_at = $2, last_renewal_date = NOW(), is_active = TRUE`,
      [userId, newExpiresAt]
    );

    await client.query("COMMIT");

    const transporter = createTransporter({
      service: process.env.PURCHASE_EMAIL_SERVICE,
      user: process.env.PURCHASE_EMAIL_USER,
      pass: process.env.PURCHASE_EMAIL_PASS,
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    if (isNewUser) {
      await transporter.sendMail({
        from: process.env.PURCHASE_EMAIL_USER,
        to: email,
        subject: "Your Certificate Studio Access Credentials",
        html: `
          <h1>Certificate Studio Access Confirmation</h1>
          <p>Thank you for your purchase! Your access has been granted for ${durationDays} days.</p>
          <h2>Your Credentials:</h2>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Temporary Password:</strong> <code>${tempPassword}</code></li>
            <li><strong>Access Expires:</strong> ${newExpiresAt.toDateString()}</li>
          </ul>
          <p>Login at: <a href="${baseUrl}/user/login">Login Page</a></p>
        `,
      });
    } else {
      await transporter.sendMail({
        from: process.env.PURCHASE_EMAIL_USER,
        to: email,
        subject: "Your Certificate Studio Plan Has Been Updated!",
        html: `
          <h1>Plan Updated Successfully!</h1>
          <p>Great news! Your Certificate Studio plan has been renewed for another <strong>${durationDays} days</strong>.</p>
          <h2>Updated Details:</h2>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>New Expiry Date:</strong> ${newExpiresAt.toDateString()}</li>
          </ul>
          <p>Your existing password remains unchanged. No action needed.</p>
          <p>Login at: <a href="${baseUrl}/user/login">Login Page</a></p>
        `,
      });
    }

    pendingPurchaseJobs.delete(tranId);

    return {
      payload: {
        status: isNewUser ? "new_access" : "renewed",
        message: isNewUser
          ? `Access granted and temporary password sent to ${email}.`
          : `Your plan has been renewed! Details sent to ${email}.`,
        email,
        expiresAt: newExpiresAt.toISOString(),
      },
      httpStatus: 200,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    pendingPurchaseJobs.delete(tranId);
    console.error("❌ Failed to finalize purchase:", err);
    return { error: { status: 500, message: "Failed to finalize purchase after payment." } };
  } finally {
    client.release();
  }
};

const completePaymentAndSend = async (tranId) => {
  if (!tranId) {
    return { error: { status: 400, message: "Missing transaction id (tran_id)." } };
  }

  const pending = pendingEmailJobs.get(tranId);
  if (pending) {
    try {
      const result = await sendEmailBatch(pending.emailJob);
      pendingEmailJobs.delete(tranId);
      return result;
    } catch (err) {
      pendingEmailJobs.delete(tranId);
      return { error: { status: 500, message: "Failed to send emails after payment." } };
    }
  }

  return await completePurchaseAfterPayment(tranId);
};

const success = async (req, res) => {
  const tranId = getTranIdFromRequest(req);
  const paymentStatus = (req.body?.status || req.query?.status || "").toString().toUpperCase();
  if (paymentStatus && !["VALID", "VALIDATED", "SUCCESS"].includes(paymentStatus)) {
    return res.status(400).send({ status: "failed", message: "Payment not validated." });
  }

  const result = await completePaymentAndSend(tranId);
  const redirectBase = getClientBaseUrl(req);
  const successUrl = `${redirectBase}/user/login?payment=success`;
  const failUrl = `${redirectBase}/pricing?payment=failed`;

  if (result.error) {
    return redirectWithMessage(res, failUrl, result.error.message || "Payment failed.");
  }
  return redirectWithMessage(res, successUrl, "Payment successful. Redirecting to login...");
};

const fail = (req, res) => {
  const redirectBase = getClientBaseUrl(req);
  redirectWithMessage(res, `${redirectBase}/pricing?payment=failed`, "Payment failed or was declined.");
};

const cancel = (req, res) => {
  const redirectBase = getClientBaseUrl(req);
  redirectWithMessage(res, `${redirectBase}/pricing?payment=cancelled`, "Payment cancelled by user.");
};

const ipn = async (req, res) => {
  const tranId = getTranIdFromRequest(req);
  const paymentStatus = (req.body?.status || "").toString().toUpperCase();
  if (paymentStatus && !["VALID", "VALIDATED", "SUCCESS"].includes(paymentStatus)) {
    return res.status(400).send({ status: "failed", message: "Payment not validated." });
  }
  const result = await completePaymentAndSend(tranId);
  if (result.error) {
    return res.status(result.error.status || 400).send({ status: "failed", message: result.error.message });
  }
  return res.status(result.httpStatus || 200).send({ tranId, ...result.payload });
};

module.exports = { success, fail, cancel, ipn };
