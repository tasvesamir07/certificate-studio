const { v4: uuidv4 } = require("uuid");
const supabase = require("./supabase");
const pool = require("../models/db");

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "certificate-studio";

// Auto-create file_metadata table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS file_metadata (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`).catch((err) => {
  console.error("Failed to create file_metadata table:", err);
});

async function storeFile(buffer, filename, mimetype) {
  if (!supabase) {
    throw new Error("Supabase is not configured on the server. Please set SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in your environment variables.");
  }

  const id = uuidv4();
  const storagePath = `uploads/${id}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimetype,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    const msg = error.message?.toLowerCase() || "";
    if (msg.includes("bucket") || msg.includes("not found") || msg.includes("does not exist")) {
      const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 104857600,
      });
      if (bucketError) throw new Error(`Failed to create storage bucket: ${bucketError.message}`);
      const { error: retryError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mimetype, cacheControl: "3600" });
      if (retryError) throw new Error(`File upload failed: ${retryError.message}`);
    } else {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Persist metadata in the database
  await pool.query(
    "INSERT INTO file_metadata (id, filename, mimetype, size, storage_path) VALUES ($1, $2, $3, $4, $5)",
    [id, filename, mimetype, buffer.length, storagePath]
  );

  return id;
}

async function getFile(id) {
  try {
    const res = await pool.query("SELECT * FROM file_metadata WHERE id = $1", [id]);
    const meta = res.rows[0];
    if (!meta) return null;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(meta.storage_path);

    if (error || !data) {
      await pool.query("DELETE FROM file_metadata WHERE id = $1", [id]);
      return null;
    }

    return {
      filename: meta.filename,
      mimetype: meta.mimetype,
      size: meta.size,
      storagePath: meta.storage_path,
      content: Buffer.from(await data.arrayBuffer()),
    };
  } catch (err) {
    console.error("Error in getFile:", err);
    return null;
  }
}

async function deleteFile(id) {
  try {
    const res = await pool.query("SELECT storage_path FROM file_metadata WHERE id = $1", [id]);
    const meta = res.rows[0];
    if (!meta) return;

    await supabase.storage.from(BUCKET).remove([meta.storage_path]);
    await pool.query("DELETE FROM file_metadata WHERE id = $1", [id]);
  } catch (err) {
    console.error("Error in deleteFile:", err);
  }
}

module.exports = { storeFile, getFile, deleteFile };
