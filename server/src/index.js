require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { setupFonts } = require("./services/fontService");

const authRoutes = require("./routes/authRoutes");
const certRoutes = require("./routes/certRoutes");
const canvaRoutes = require("./routes/canvaRoutes");

const app = express();
const port = process.env.PORT || 5000;

// Setup Fonts
setupFonts();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ["Content-Type", "Content-Disposition"],
}));

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", certRoutes);
app.use("/api/canva", canvaRoutes);

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
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File too large. Maximum size is 100MB." });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});
