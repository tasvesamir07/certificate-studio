const pool = require("../models/db");

const getCertificate = async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      `SELECT ic.id, ic.recipient_name as "recipientName", ic.recipient_email as "recipientEmail",
              ic.certificate_url as "certificateUrl", ic.issue_date as "issueDate",
              u.display_name as "issuerName"
       FROM issued_certificates ic
       JOIN users u ON ic.user_id = u.id
       WHERE ic.id = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "Certificate verification code not found." });
    }

    res.send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const issueCertificate = async (req, res) => {
  const { id, userId, recipientName, recipientEmail, certificateUrl } = req.body;
  if (!userId || !recipientName || !recipientEmail || !certificateUrl) {
    return res.status(400).send({ message: "userId, recipientName, recipientEmail, and certificateUrl are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO issued_certificates (id, user_id, recipient_name, recipient_email, certificate_url)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5)
       RETURNING id, recipient_name as "recipientName", recipient_email as "recipientEmail", certificate_url as "certificateUrl", issue_date as "issueDate"`,
      [id || null, userId, recipientName, recipientEmail, certificateUrl]
    );
    res.status(201).send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

module.exports = {
  getCertificate,
  issueCertificate,
};
