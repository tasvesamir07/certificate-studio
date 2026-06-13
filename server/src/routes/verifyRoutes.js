const express = require("express");
const router = express.Router();
const verifyController = require("../controllers/verifyController");

router.get("/:code", verifyController.getCertificate);
router.post("/issue", verifyController.issueCertificate);

module.exports = router;
