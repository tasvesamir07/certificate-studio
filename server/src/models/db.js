const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  // Fallback for local development if DATABASE_URL is not set
  ...(process.env.DATABASE_URL
    ? {}
    : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    }),
});
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
  } else {
    console.log("✅ PostgreSQL database connected successfully.");
  }
});

module.exports = pool;
