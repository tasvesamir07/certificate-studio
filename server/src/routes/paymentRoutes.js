const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/success", paymentController.success);
router.post("/fail", paymentController.fail);
router.post("/cancel", paymentController.cancel);
router.post("/ipn", paymentController.ipn);

module.exports = router;
