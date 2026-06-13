const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const SSLCommerzPayment = require("sslcommerz-lts");
const pool = require("../models/db");
const { createTransporter } = require("../services/mailer");
const { pendingPurchaseJobs } = require("./certController");

// In-memory stores (to be replaced with Redis/DB for production)
const otpStore = new Map();
const resetTokenStore = new Map();
const OTP_TTL_MS = 2 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const DEFAULT_PAYMENT_AMOUNT = 50;

const getServerBaseUrl = (req) => {
  const host = req.get("host") || "localhost:5000";
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${host}`).replace(/\/$/, "");
};

const isValidEmailFormat = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send({ message: "Email and password are required." });

  try {
    const userQuery =
      "SELECT u.id, u.display_name, u.password_hash, ua.access_expires_at, ua.is_active FROM users u JOIN user_access ua ON u.id = ua.user_id WHERE u.email = $1";
    const result = await pool.query(userQuery, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).send({ message: "Invalid email or access has expired." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).send({ message: "Invalid password." });

    const expiryDate = new Date(user.access_expires_at);
    if (expiryDate < new Date()) {
      return res.status(401).send({ message: "Your access has expired. Please renew via the pricing page." });
    }

    res.send({
      message: "Login successful.",
      id: user.id,
      email: user.email,
      sessionToken: uuidv4(),
      accessExpires: expiryDate.toISOString(),
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const signup = async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) return res.status(400).send({ message: "All fields are required." });

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name",
      [email.trim(), hash, displayName.trim()]
    );
    res.status(201).send(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(400).send({ message: "Email already exists." });
    res.status(500).send({ message: error.message });
  }
};

const verifyPurchase = async (req, res) => {
  const { email, name, phone } = req.body;
  const trimmedEmail = (email || "").toString().trim();
  const trimmedName = (name || "").toString().trim();
  const trimmedPhone = (phone || "").toString().trim();

  if (!trimmedEmail || !isValidEmailFormat(trimmedEmail)) {
    return res.status(400).send({ message: "A valid email address is required." });
  }
  if (!trimmedName) {
    return res.status(400).send({ message: "Name is required to complete the purchase." });
  }
  if (!trimmedPhone) {
    return res.status(400).send({ message: "Phone number is required to complete the purchase." });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (dbErr) {
    console.error("❌ Database connection failed during purchase request:", dbErr);
    return res.status(500).send({ message: "Database connection failed." });
  }

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT u.id, ua.access_expires_at FROM users u LEFT JOIN user_access ua ON u.id = ua.user_id WHERE u.email = $1`,
      [trimmedEmail]
    );

    const existingUser = userResult.rows.length > 0 ? userResult.rows[0] : null;

    if (existingUser) {
      const expiresAt = existingUser.access_expires_at ? new Date(existingUser.access_expires_at) : null;
      if (expiresAt && expiresAt > new Date() && !req.body.forceRenew) {
        await client.query("ROLLBACK");
        return res.status(200).send({
          message: "You are already subscribed. Your access is currently active.",
          expiresAt: expiresAt.toISOString(),
          status: "active",
        });
      }
    }

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to process purchase verification:", error);
    return res.status(500).send({ message: "Failed to process purchase verification." });
  } finally {
    client.release();
  }

  const store_id = process.env.SSL_COMMERZ_STORE_ID;
  const store_passwd = process.env.SSL_COMMERZ_STORE_PASSWORD;
  const is_live = (process.env.IS_LIVE || "false").toLowerCase() === "true";

  if (!store_id || !store_passwd) {
    console.error("❌ Missing SSLCommerz credentials.");
    return res.status(500).send({ message: "Server misconfiguration: Missing payment credentials." });
  }

  const tranId = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const baseUrl = getServerBaseUrl(req);
  const totalAmount = Number(req.body.totalAmount || req.body.amount) > 0
    ? Number(req.body.totalAmount || req.body.amount)
    : DEFAULT_PAYMENT_AMOUNT;

  const paymentPayload = {
    total_amount: totalAmount,
    currency: "BDT",
    tran_id: tranId,
    success_url: `${baseUrl}/api/payments/success`,
    fail_url: `${baseUrl}/api/payments/fail`,
    cancel_url: `${baseUrl}/api/payments/cancel`,
    ipn_url: `${baseUrl}/api/payments/ipn`,
    shipping_method: "Courier",
    product_name: "Certificate Access",
    product_category: "Digital",
    product_profile: "general",
    cus_name: trimmedName,
    cus_email: trimmedEmail,
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: trimmedPhone,
    cus_fax: trimmedPhone,
    ship_name: trimmedName,
    ship_add1: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: "1000",
    ship_country: "Bangladesh",
  };

  try {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(paymentPayload);
    const GatewayPageURL = apiResponse?.GatewayPageURL;

    if (!GatewayPageURL) {
      console.error("❌ SSLCommerz Init Failed (No URL):", apiResponse);
      return res.status(500).send({ message: "Payment Gateway Error: No URL returned.", details: apiResponse });
    }

    pendingPurchaseJobs.set(tranId, {
      email: trimmedEmail,
      name: trimmedName,
      phone: trimmedPhone,
      amount: totalAmount,
      days: parseInt(req.body.days, 10) || ACCESS_PERIOD_DAYS,
    });

    return res.status(200).send({
      status: "payment_pending",
      message: "Redirecting to payment to complete your purchase and receive your password.",
      paymentUrl: GatewayPageURL,
      tranId,
    });
  } catch (err) {
    console.error("❌ Payment initialization crashed:", err);
    return res.status(500).send({ message: `Payment Error: ${err.message}` });
  }
};

const getProfile = async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name as "displayName", u.phone, 
              ua.access_expires_at as "accessExpiresAt", ua.is_active as "isActive" 
       FROM users u 
       LEFT JOIN user_access ua ON u.id = ua.user_id 
       WHERE u.email = $1`,
      [email.trim()]
    );
    if (result.rows.length === 0) return res.status(404).send({ message: "User not found." });
    res.send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  const { email, displayName, phone } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET display_name = $1, phone = $2 WHERE email = $3 RETURNING display_name as "displayName", phone, email',
      [displayName, phone, email.trim()]
    );
    if (result.rows.length === 0) return res.status(404).send({ message: "User not found." });
    res.send({ message: "Profile updated successfully.", user: result.rows[0] });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const getPresets = async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.id, p.preset_type as "presetType", p.preset_name as "presetName", p.template_text as "templateText", p.signature_text as "signatureText"
       FROM email_presets p
       JOIN users u ON p.user_id = u.id
       WHERE u.email = $1
       ORDER BY p.created_at ASC`,
      [email.trim()]
    );
    res.send(result.rows);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const savePreset = async (req, res) => {
  const { email, presetType, presetName, templateText, signatureText } = req.body;
  try {
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim()]);
    if (userResult.rows.length === 0) return res.status(404).send({ message: "User not found." });
    const userId = userResult.rows[0].id;

    const upsertQuery = `
      INSERT INTO email_presets (user_id, preset_type, preset_name, template_text, signature_text)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, preset_type, preset_name) 
      DO UPDATE SET template_text = EXCLUDED.template_text, signature_text = EXCLUDED.signature_text
      RETURNING id, preset_type as "presetType", preset_name as "presetName", template_text as "templateText", signature_text as "signatureText"
    `;
    const result = await pool.query(upsertQuery, [userId, presetType, presetName, templateText, signatureText]);
    res.send({ message: "Preset saved successfully.", preset: result.rows[0] });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const deletePreset = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM email_presets WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) return res.status(404).send({ message: "Preset not found." });
    res.send({ message: "Preset deleted successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  try {
    const result = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [email.trim()]);
    if (result.rows.length === 0) return res.status(404).send({ message: "User not found." });

    const user = result.rows[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).send({ message: "Incorrect current password." });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, user.id]);
    res.send({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmailFormat(email)) return res.status(400).send({ message: "Valid email required." });

  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim()]);
    if (result.rows.length === 0) return res.status(404).send({ message: "Account not found." });

    const otp = generateOTP();
    otpStore.set(email.trim(), { otp, expiresAt: Date.now() + OTP_TTL_MS });

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.PURCHASE_EMAIL_USER,
      to: email.trim(),
      subject: "Password Reset OTP",
      html: `<div>OTP: ${otp}</div>`
    });

    res.send({ message: "OTP sent." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore.get(email?.trim());
  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
    return res.status(400).send({ message: "Invalid or expired OTP." });
  }

  otpStore.delete(email.trim());
  const resetToken = uuidv4();
  resetTokenStore.set(email.trim(), { token: resetToken, expiresAt: Date.now() + RESET_TOKEN_TTL_MS });
  res.send({ resetToken });
};

const resetPassword = async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  const stored = resetTokenStore.get(email?.trim());
  if (!stored || stored.token !== resetToken || Date.now() > stored.expiresAt) {
    return res.status(400).send({ message: "Invalid or expired reset session." });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, email.trim()]);
    resetTokenStore.delete(email.trim());
    res.send({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

module.exports = {
  login,
  signup,
  verifyPurchase,
  getProfile,
  updateProfile,
  getPresets,
  savePreset,
  deletePreset,
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
