require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "migrations");

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    };
  }
  return {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  };
}

async function main() {
  const client = new Client(buildConfig());
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    await client.end();
    return;
  }

  const { rows } = await client.query("SELECT version, checksum FROM schema_migrations");
  const applied = new Map(rows.map((r) => [r.version, r.checksum]));

  let pending = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");

    const previous = applied.get(file);
    if (previous) {
      if (previous !== checksum) {
        throw new Error(
          `Migration "${file}" was modified after it was applied. ` +
            "Create a NEW migration file instead of editing an applied one."
        );
      }
      console.log(`Already applied: ${file}`);
      continue;
    }

    console.log(`Applying ${file}...`);
    await client.query("BEGIN");
    try {
      await client.query(content);
      await client.query(
        "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
        [file, checksum]
      );
      await client.query("COMMIT");
      pending++;
      console.log(`Applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration "${file}" failed: ${err.message}`);
    }
  }

  if (pending === 0) {
    console.log("Database schema is up to date.");
  } else {
    console.log(`Applied ${pending} pending migration(s).`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});