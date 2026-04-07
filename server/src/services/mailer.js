const nodemailer = require("nodemailer");
const { buildEmailBodies } = require("../utils/helpers");

const createTransporter = (config) => {
  return nodemailer.createTransport({
    service: config.service,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

const sendEmail = async (transporter, mailOptions) => {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("❌ Email error:", error.message);
    throw error;
  }
};

module.exports = {
  createTransporter,
  sendEmail
};
