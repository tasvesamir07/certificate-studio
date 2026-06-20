const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, templateController.getTemplates);
router.post("/", requireAuth, templateController.createTemplate);
router.put("/:id", requireAuth, templateController.updateTemplate);
router.delete("/:id", requireAuth, templateController.deleteTemplate);

module.exports = router;
