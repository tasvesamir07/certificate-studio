require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { setupFonts } = require("./services/fontService");

const authRoutes = require("./routes/authRoutes");
const certRoutes = require("./routes/certRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
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
app.use("/api/payments", paymentRoutes);
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
