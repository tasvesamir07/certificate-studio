const express = require("express");
const router = express.Router();
const canvaController = require("../controllers/canvaController");
const { requireAuth } = require("../middleware/auth");

// Canva Connect API Routes
router.get("/auth-url", requireAuth, canvaController.getAuthUrl);
router.get("/callback", canvaController.handleCallback);
router.get("/designs", requireAuth, canvaController.getDesigns);
router.post("/designs/export", requireAuth, canvaController.exportDesign);
router.post("/disconnect", requireAuth, canvaController.disconnect);
router.get("/check-connection", requireAuth, canvaController.checkConnection);

module.exports = router;
