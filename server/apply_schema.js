const pool = require("./src/models/db");
const fs = require("fs");
const path = require("path");

const sql = fs.readFileSync(path.join(__dirname, "src/models/schema_update.sql"), "utf8");

async function applySchema() {
    try {
        await pool.query(sql);
        console.log("✅ Canva tokens table created or already exists.");
        process.exit(0);
    } catch (err) {
        console.error("❌ SQL Error:", err.message);
        process.exit(1);
    }
}

applySchema();
