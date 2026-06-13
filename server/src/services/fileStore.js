const { v4: uuidv4 } = require("uuid");
const supabase = require("./supabase");

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "certificate-studio";

const fileMeta = new Map();

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

  fileMeta.set(id, { filename, mimetype, size: buffer.length, storagePath });
  return id;
}

async function getFile(id) {
  const meta = fileMeta.get(id);
  if (!meta) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(meta.storagePath);

  if (error || !data) {
    fileMeta.delete(id);
    return null;
  }

  return { ...meta, content: Buffer.from(await data.arrayBuffer()) };
}

async function deleteFile(id) {
  const meta = fileMeta.get(id);
  if (!meta) return;

  await supabase.storage.from(BUCKET).remove([meta.storagePath]);
  fileMeta.delete(id);
}

module.exports = { storeFile, getFile, deleteFile };
