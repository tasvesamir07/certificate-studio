const express = require("express");
const router = express.Router();
const verifyController = require("../controllers/verifyController");
const { requireAuth } = require("../middleware/auth");

router.get("/:code", verifyController.getCertificate);
router.post("/issue", requireAuth, verifyController.issueCertificate);

module.exports = router;
