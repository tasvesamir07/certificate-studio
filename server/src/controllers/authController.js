const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const pool = require("../models/db");
const { createTransporter } = require("../services/mailer");

const otpStore = new Map();
const resetTokenStore = new Map();
const OTP_TTL_MS = 2 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const isValidEmailFormat = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send({ message: "Email and password are required." });

  try {
    const result = await pool.query(
      "SELECT id, email, display_name, password_hash FROM users WHERE email = $1",
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).send({ message: "Invalid email or password." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).send({ message: "Invalid email or password." });

    res.send({
      message: "Login successful.",
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      sessionToken: uuidv4(),
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const signup = async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) return res.status(400).send({ message: "All fields are required." });

  const passwordErrors = [];
  if (password.length < 8) passwordErrors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) passwordErrors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) passwordErrors.push("One lowercase letter");
  if (!/\d/.test(password)) passwordErrors.push("One number");
  if (!/[\W_]/.test(password)) passwordErrors.push("One special character");
  if (passwordErrors.length > 0) {
    return res.status(400).send({ message: "Password must include: " + passwordErrors.join(", ") + "." });
  }

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name",
        [email.trim(), hash, displayName.trim()]
      );

      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO user_access (user_id, access_expires_at, last_renewal_date, is_active)
         VALUES ($1, '2099-12-31T23:59:59Z', NOW(), TRUE)
         ON CONFLICT (user_id)
         DO UPDATE SET access_expires_at = '2099-12-31T23:59:59Z', is_active = TRUE`,
        [userId]
      );

      await client.query("COMMIT");

      const transporter = createTransporter({
        service: process.env.PURCHASE_EMAIL_SERVICE,
        user: process.env.PURCHASE_EMAIL_USER,
        pass: process.env.PURCHASE_EMAIL_PASS,
      });

      await transporter.sendMail({
        from: process.env.PURCHASE_EMAIL_USER,
        to: email.trim(),
        subject: "Welcome to Certificate Studio",
        html: `
          <h1>Welcome to Certificate Studio!</h1>
          <p>Your account has been created successfully. You now have full access to all features.</p>
          <p><strong>Email:</strong> ${email.trim()}</p>
          <p><strong>Name:</strong> ${displayName.trim()}</p>
          <p>Login at: <a href="${process.env.PUBLIC_BASE_URL || 'http://localhost:5000'}/user/login">Certificate Studio</a></p>
        `,
      });

      res.status(201).send(userResult.rows[0]);
    } catch (innerErr) {
      await client.query("ROLLBACK");
      if (innerErr.code === "23505") {
        return res.status(400).send({ message: "Email already exists." });
      }
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).send({ message: error.message });
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

    const passwordErrors = [];
    if (newPassword.length < 8) passwordErrors.push("At least 8 characters");
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push("One uppercase letter");
    if (!/[a-z]/.test(newPassword)) passwordErrors.push("One lowercase letter");
    if (!/\d/.test(newPassword)) passwordErrors.push("One number");
    if (!/[\W_]/.test(newPassword)) passwordErrors.push("One special character");
    if (passwordErrors.length > 0) {
      return res.status(400).send({ message: "New password must include: " + passwordErrors.join(", ") + "." });
    }

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

    const transporter = createTransporter({
      service: process.env.PURCHASE_EMAIL_SERVICE,
      user: process.env.PURCHASE_EMAIL_USER,
      pass: process.env.PURCHASE_EMAIL_PASS,
    });
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

  const passwordErrors = [];
  if (newPassword.length < 8) passwordErrors.push("At least 8 characters");
  if (!/[A-Z]/.test(newPassword)) passwordErrors.push("One uppercase letter");
  if (!/[a-z]/.test(newPassword)) passwordErrors.push("One lowercase letter");
  if (!/\d/.test(newPassword)) passwordErrors.push("One number");
  if (!/[\W_]/.test(newPassword)) passwordErrors.push("One special character");
  if (passwordErrors.length > 0) {
    return res.status(400).send({ message: "Password must include: " + passwordErrors.join(", ") + "." });
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
