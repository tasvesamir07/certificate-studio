const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.get("/profile/:email", requireAuth, authController.getProfile);
router.post("/update-profile", requireAuth, authController.updateProfile);
router.get("/presets/:email", requireAuth, authController.getPresets);
router.post("/presets", requireAuth, authController.savePreset);
router.delete("/presets/:id", requireAuth, authController.deletePreset);
router.post("/change-password", requireAuth, authController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
