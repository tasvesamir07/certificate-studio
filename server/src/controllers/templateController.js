const pool = require("../models/db");

const getTemplates = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send({ message: "userId is required." });
  }

  try {
    const result = await pool.query(
      "SELECT id, user_id as \"userId\", name, template_url as \"templateUrl\", template_back_url as \"templateBackUrl\", layout, category, created_at as \"createdAt\" FROM templates WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.send(result.rows);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const createTemplate = async (req, res) => {
  const { userId, name, templateUrl, templateBackUrl, layout, category } = req.body;
  if (!userId || !name || !templateUrl || !layout) {
    return res.status(400).send({ message: "userId, name, templateUrl, and layout are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO templates (user_id, name, template_url, template_back_url, layout, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id as \"userId\", name, template_url as \"templateUrl\", template_back_url as \"templateBackUrl\", layout, category, created_at as \"createdAt\"",
      [userId, name, templateUrl, templateBackUrl, JSON.stringify(layout), category || "General"]
    );
    res.status(201).send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, layout, category } = req.body;

  try {
    const result = await pool.query(
      "UPDATE templates SET name = COALESCE($1, name), layout = COALESCE($2, layout), category = COALESCE($3, category) WHERE id = $4 RETURNING id, user_id as \"userId\", name, template_url as \"templateUrl\", template_back_url as \"templateBackUrl\", layout, category, created_at as \"createdAt\"",
      [name, layout ? JSON.stringify(layout) : null, category, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "Template not found." });
    }
    res.send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM templates WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send({ message: "Template not found." });
    }
    res.send({ message: "Template deleted successfully.", id });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
