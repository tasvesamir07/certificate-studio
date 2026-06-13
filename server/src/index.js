require("dotenv").config();
const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
  console.log("✅ Sentry server-side initialized.");
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const { setupFonts } = require("./services/fontService");

const authRoutes = require("./routes/authRoutes");
const certRoutes = require("./routes/certRoutes");
const canvaRoutes = require("./routes/canvaRoutes");
const templateRoutes = require("./routes/templateRoutes");
const verifyRoutes = require("./routes/verifyRoutes");

const app = express();
const port = process.env.PORT || 5000;

// Setup Fonts
const helmet = require("helmet");
const { authLimiter, generatorLimiter, uploadLimiter } = require("./middleware/rateLimiter");

// Setup Fonts
setupFonts();

// Middleware
// Apply helmet for secure headers and CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://*.canva.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.canva.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ["Content-Type", "Content-Disposition"],
}));

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// Routes
// 1. Auth routes with strict limiter
app.use("/api/auth", authLimiter, authRoutes);

// 2. Canva routes
app.use("/api/canva", canvaRoutes);

// Templates and Verification routes
app.use("/api/templates", templateRoutes);
app.use("/api/verify", verifyRoutes);

// 3. Apply limiters to specific heavy endpoints before mounting certRoutes
app.post("/api/generate", generatorLimiter);
app.post("/api/generate-and-send", generatorLimiter);
app.post("/api/generate-preview", generatorLimiter);
app.post("/api/send-single", generatorLimiter);
app.post("/api/attachments/sign-upload", uploadLimiter);

// 4. Mount certRoutes
app.use("/api", certRoutes);

// Static folders
app.use("/fonts", express.static(path.join(__dirname, "../fonts")));

// Health Check
app.get("/", (req, res) => {
  res.send({ status: "ok", message: "Modular Certificate Generator API is running." });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File too large. Maximum size is 100MB." });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
