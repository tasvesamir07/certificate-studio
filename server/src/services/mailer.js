const nodemailer = require("nodemailer");

const createTransporter = (config) => {
  return nodemailer.createTransport({
    service: config.service,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

module.exports = {
  createTransporter,
};
