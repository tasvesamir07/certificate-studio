const nodemailer = require("nodemailer");

const createTransporter = (config) => {
  const transportOptions = config.smtpHost
    ? {
        host: config.smtpHost,
        port: Number(config.smtpPort) || 587,
        secure: config.smtpSecure === true || config.smtpSecure === "true",
      }
    : { service: config.service };

  return nodemailer.createTransport({
    ...transportOptions,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

module.exports = { createTransporter };
