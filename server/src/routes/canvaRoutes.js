const express = require("express");
const router = express.Router();
const canvaController = require("../controllers/canvaController");

// Canva Connect API Routes
router.get("/auth-url", canvaController.getAuthUrl);
router.get("/callback", canvaController.handleCallback);
router.get("/designs", canvaController.getDesigns);
router.post("/designs/export", canvaController.exportDesign);
router.post("/disconnect", canvaController.disconnect);
router.get("/check-connection", canvaController.checkConnection);

module.exports = router;
