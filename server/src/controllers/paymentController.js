const { pendingEmailJobs, sendEmailBatch, pendingPurchaseJobs } = require("./certController");

const success = async (req, res) => {
  const tranId = req.body?.tran_id || req.query?.tran_id;
  const redirectBase = process.env.CLIENT_BASE_URL || "http://localhost:3000";
  res.redirect(`${redirectBase}/user/login?payment=success&tranId=${tranId}`);
};

const fail = (req, res) => {
  const redirectBase = process.env.CLIENT_BASE_URL || "http://localhost:3000";
  res.redirect(`${redirectBase}/pricing?payment=failed`);
};

const cancel = (req, res) => {
  const redirectBase = process.env.CLIENT_BASE_URL || "http://localhost:3000";
  res.redirect(`${redirectBase}/pricing?payment=failed`);
};

const ipn = async (req, res) => {
  const tranId = req.body?.tran_id || req.query?.tran_id;
  const status = req.body?.status;
  if (status === "VALID" || status === "VALIDATED") {
    console.log(`Payment validated for ${tranId}`);
    // Optional: add logic here if needed
  }
  res.send({ status: "processed" });
};

module.exports = { success, fail, cancel, ipn };
