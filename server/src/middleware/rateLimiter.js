const rateLimit = require("express-rate-limit");

// 1. Strict Limiter for Auth Routes (Login, Signup, Password Reset)
// Max 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    status: 429,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 2. Moderate Limiter for Certificate Generation / Sending Routes
// Max 50 requests per hour per IP
const generatorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    status: 429,
    message: "Too many certificate generation requests from this IP. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Moderate Limiter for File / Attachment Uploads
// Max 20 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    status: 429,
    message: "Too many file upload attempts from this IP. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  generatorLimiter,
  uploadLimiter,
};
