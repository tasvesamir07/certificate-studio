const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/verify-purchase", authController.verifyPurchase);
router.get("/profile/:email", authController.getProfile);
router.post("/update-profile", authController.updateProfile);
router.get("/presets/:email", authController.getPresets);
router.post("/presets", authController.savePreset);
router.delete("/presets/:id", authController.deletePreset);
router.post("/change-password", authController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
