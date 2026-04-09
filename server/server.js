require("dotenv").config();

const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const nodemailer = require("nodemailer");
const dns = require("dns").promises;
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const axios = require("axios"); // Added for dynamic font downloading
const { v4: uuidv4 } = require("uuid");
const { jsPDF } = require("jspdf");
const { Pool } = require("pg");
const bcrypt = require("bcrypt"); // NEW: For password hashing
const SSLCommerzPayment = require("sslcommerz-lts");
const cloudinary = require("cloudinary").v2; // Added for Cloudinary

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const store_id = (process.env.SSL_COMMERZ_STORE_ID || "").trim();
const store_passwd = (process.env.SSL_COMMERZ_STORE_PASSWORD || "").trim();

const getServerBaseUrl = (req) => {
  const host = req.get("host") || `localhost:${port}`;
  const url = process.env.PUBLIC_BASE_URL || `${req.protocol}://${host}`;
  return url.replace(/\/$/, ""); // Remove trailing slash
};
const is_live = (process.env.IS_LIVE || "false").toLowerCase() === "true";
const app = express();
const port = process.env.PORT || 5000;
const pendingEmailJobs = new Map();
const pendingPurchaseJobs = new Map();
const activeJobs = new Map(); // New: Track active email sending jobs
const sharedFileStore = new Map(); // New: Store shared files temporarily
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // Increased to 100MB

// -------------------------------------------

const rejectIfTooLarge = (req, res, next) => {
  const lengthHeader = req.headers["content-length"];
  const contentLength = lengthHeader ? parseInt(lengthHeader, 10) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    return res.status(413).send({
      message:
        "Uploads over ~100MB are not supported on this server. Please reduce the total size of your template/data/attachments and try again.",
    });
  }
  return next();
};
const CLIENT_BASE_URL =
  process.env.CLIENT_BASE_URL || process.env.PUBLIC_BASE_URL || null;

app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["Content-Type", "Content-Disposition"],
  })
);

// --- SSE Endpoint for Real-time Progress ---
app.get("/api/progress/:id", (req, res) => {
  const jobId = req.params.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial status
  const job = activeJobs.get(jobId);
  if (job) {
    sendUpdate({
      status: job.status,
      processed: job.processed,
      total: job.total,
      successCount: job.successCount,
      failureCount: job.failureCount,
    });
  } else {
    sendUpdate({ status: "not_found" });
    res.end();
    return;
  }

  // Poll for updates (simple implementation)
  const interval = setInterval(() => {
    const currentJob = activeJobs.get(jobId);
    if (!currentJob) {
      clearInterval(interval);
      res.end();
      return;
    }

    sendUpdate({
      status: currentJob.status,
      processed: currentJob.processed,
      total: currentJob.total,
      successCount: currentJob.successCount,
      failureCount: currentJob.failureCount,
      payload: currentJob.payload, // Send final payload on completion
    });

    if (currentJob.status === "completed" || currentJob.status === "failed") {
      clearInterval(interval);
      res.end();
      // Cleanup after a delay
      setTimeout(() => activeJobs.delete(jobId), 300000); // 5 mins
    }
  }, 1000);

  req.on("close", () => {
    clearInterval(interval);
  });
});
// -------------------------------------------

// Health check endpoint
app.get("/", (req, res) => {
  res.send({ status: "ok", message: "Certificate Generator API is running." });
});

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// --- POSTGRES CONFIGURATION ---
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
// ------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 20,
    fields: 100,
  },
});

/**
 * Utility to cleanup uploaded files after the request is finished.
 */
const cleanupReqFiles = (req) => {
  const files = req.files;
  if (!files) return;

  const paths = [];
  if (Array.isArray(files)) {
    files.forEach(f => paths.push(f.path));
  } else {
    Object.values(files).forEach(fileArr => {
      fileArr.forEach(f => paths.push(f.path));
    });
  }

  paths.forEach(p => {
    if (p && fs.existsSync(p)) {
      fs.unlink(p, (err) => {
        if (err) console.error("Cleanup error:", err);
      });
    }
  });
};

const parseJsonArrayField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const sanitizePublicIdSegment = (value = "", fallback = "attachment") => {
  const cleaned = stripExtension(value)
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return cleaned || fallback;
};

const getRemoteAttachmentPublicId = (attachment = {}) =>
  (
    attachment?.publicId ||
    attachment?.public_id ||
    attachment?.cloudinaryPublicId ||
    ""
  )
    .toString()
    .trim();

const getRemoteAttachmentResourceType = (attachment = {}) =>
  (
    attachment?.resourceType ||
    attachment?.resource_type ||
    attachment?.cloudinaryResourceType ||
    "raw"
  )
    .toString()
    .trim() || "raw";

const getRemoteAttachmentFormat = (attachment = {}) => {
  const explicitFormat = (
    attachment?.format ||
    attachment?.extension ||
    ""
  )
    .toString()
    .trim()
    .replace(/^\./, "")
    .toLowerCase();

  if (explicitFormat) return explicitFormat;

  const filename = (
    attachment?.filename ||
    attachment?.originalFilename ||
    attachment?.original_filename ||
    ""
  )
    .toString()
    .trim();
  const ext = path.extname(filename).replace(/^\./, "").toLowerCase();
  return ext || "";
};

const buildRemoteAttachmentCandidateUrls = (attachment = {}) => {
  const urls = [];
  const seen = new Set();
  const push = (value) => {
    const normalized = (value || "").toString().trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(normalized);
  };

  push(attachment?.url);
  push(attachment?.secureUrl);
  push(attachment?.secure_url);

  const publicId = getRemoteAttachmentPublicId(attachment);
  const resourceType = getRemoteAttachmentResourceType(attachment);
  const format = getRemoteAttachmentFormat(attachment);
  const version = Number(attachment?.version);

  if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) {
    return urls;
  }

  if (format && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      push(
        cloudinary.utils.private_download_url(publicId, format, {
          resource_type: resourceType,
          type: "upload",
          secure: true,
        })
      );
    } catch (_error) {}
  }

  const urlOptions = {
    resource_type: resourceType,
    type: "upload",
    secure: true,
    sign_url: false,
  };
  if (Number.isFinite(version) && version > 0) {
    urlOptions.version = version;
  }
  if (format) {
    urlOptions.format = format;
  }

  push(cloudinary.url(publicId, urlOptions));
  return urls;
};

const downloadRemoteAttachment = async (attachment = {}) => {
  const candidateUrls = buildRemoteAttachmentCandidateUrls(attachment);
  if (!candidateUrls.length) {
    throw new Error(
      "Attachment file metadata is incomplete. Please re-upload and try again."
    );
  }

  let lastError = null;
  let sawAccessFailure = false;

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await axios.get(candidateUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      return {
        filename: fixFilenameEncoding(attachment.filename || "attachment"),
        content: Buffer.from(response.data),
        contentType:
          attachment.contentType ||
          attachment.content_type ||
          response.headers["content-type"] ||
          "application/octet-stream",
      };
    } catch (error) {
      const statusCode = error?.response?.status;
      lastError = error;

      if (statusCode === 401 || statusCode === 403) {
        sawAccessFailure = true;
        continue;
      }

      if (statusCode === 404) {
        continue;
      }

      break;
    }
  }

  const finalStatusCode = lastError?.response?.status;
  if (sawAccessFailure || finalStatusCode === 401 || finalStatusCode === 403) {
    throw new Error(
      "Attachment file has expired or is no longer accessible. Please re-upload the attachment and try again."
    );
  }

  if (finalStatusCode === 404) {
    throw new Error(
      "Attachment file could not be found. Please re-upload and try again."
    );
  }

  throw new Error(
    `Failed to download attachment: ${lastError?.message || "Unknown error"}`
  );
};

const destroyRemoteAttachments = async (attachments = []) => {
  const uniqueAssets = [];
  const seen = new Set();

  attachments.forEach((attachment) => {
    const publicId = getRemoteAttachmentPublicId(attachment);
    const resourceType = getRemoteAttachmentResourceType(attachment);
    if (!publicId) return;

    const key = `${resourceType}:${publicId}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueAssets.push({ publicId, resourceType });
  });

  if (!uniqueAssets.length) return [];

  return Promise.allSettled(
    uniqueAssets.map((asset) =>
      cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
        invalidate: true,
      })
    )
  );
};

const TEMP_ATTACHMENT_TAG = "certificate-studio-temp";
const DEFAULT_ATTACHMENT_CLEANUP_MAX_AGE = (
  process.env.ATTACHMENT_CLEANUP_MAX_AGE || "2d"
).trim();

const isAuthorizedCronRequest = (req) => {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = (req.get("authorization") || "").trim();
  return authHeader === `Bearer ${cronSecret}`;
};

const cleanupExpiredRemoteAttachments = async ({
  maxAge = DEFAULT_ATTACHMENT_CLEANUP_MAX_AGE,
  maxBatches = 10,
} = {}) => {
  const deleted = [];
  let batchCount = 0;
  let nextCursor = undefined;

  while (batchCount < maxBatches) {
    let search = cloudinary.search
      .expression(
        `tags=${TEMP_ATTACHMENT_TAG} AND resource_type=raw AND type=upload AND uploaded_at<${maxAge}`
      )
      .sort_by("uploaded_at", "asc")
      .max_results(100);

    if (nextCursor) {
      search = search.next_cursor(nextCursor);
    }

    const result = await search.execute();

    const resources = Array.isArray(result?.resources) ? result.resources : [];
    if (!resources.length) {
      return {
        deletedCount: deleted.length,
        deletedPublicIds: deleted,
        nextCursor: null,
      };
    }

    const publicIds = resources
      .map((resource) => resource.public_id)
      .filter(Boolean);

    if (!publicIds.length) {
      return {
        deletedCount: deleted.length,
        deletedPublicIds: deleted,
        nextCursor: result?.next_cursor || null,
      };
    }

    await cloudinary.api.delete_resources(publicIds, {
      resource_type: "raw",
      type: "upload",
    });

    deleted.push(...publicIds);
    batchCount += 1;
    nextCursor = result?.next_cursor;

    if (!nextCursor) {
      break;
    }
  }

  return {
    deletedCount: deleted.length,
    deletedPublicIds: deleted,
    nextCursor: nextCursor || null,
  };
};

const buildAttachmentUploadSignature = ({
  filename = "attachment.pdf",
  purpose = "certificate",
} = {}) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary is not configured for attachment uploads.");
  }

  const safePurpose = purpose === "shared" ? "shared" : "certificate";
  const folder = `certificate-studio/email-attachments/${safePurpose}`;
  const publicId = `${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}-${sanitizePublicIdSegment(filename)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    public_id: publicId,
    tags: `${TEMP_ATTACHMENT_TAG},certificate-studio-${safePurpose}`,
    timestamp,
  };

  return {
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    publicId,
    resourceType: "raw",
    tags: paramsToSign.tags,
    signature: cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    ),
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
  };
};


const os = require("os"); // Added os module

const uploadsDir = os.tmpdir();
const fontsDir = path.join(__dirname, "fonts");
const dynamicFontsDir = path.join(os.tmpdir(), "dynamic-fonts");

// Ensure dynamic fonts directory exists
if (!fs.existsSync(dynamicFontsDir)) {
  fs.mkdirSync(dynamicFontsDir, { recursive: true });
}

// --- Image Upload Storage ---
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-original
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// Limit image uploads to 5MB
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});
// ----------------------------


const availableFonts = new Set();
const fontList = [];
let DEFAULT_FONT = "sans-serif";

function setupFonts() {
  if (!fs.existsSync(fontsDir)) {
    console.warn(
      `Fonts folder not found at ${fontsDir}. Please create it and add your .ttf files.`
    );
    return;
  }

  console.log(`Loading fonts from: ${fontsDir}`);

  try {
    const files = fs.readdirSync(fontsDir);
    const fontFiles = files.filter(f => f.toLowerCase().endsWith(".ttf") || f.toLowerCase().endsWith(".otf"));

    if (fontFiles.length === 0) {
      console.warn(`No .ttf or .otf files found in ${fontsDir}`);
    }

    for (const file of fontFiles) {
      const fontPath = path.join(fontsDir, file);
      // Derive family name from filename (e.g., "PinyonScript-Regular" from "PinyonScript-Regular.ttf")
      const family = path.parse(file).name.replace(/[-_]/g, ' ');

      try {
        GlobalFonts.registerFromPath(fontPath, family);
        availableFonts.add(family);
        fontList.push({ family: family, file: file });
        console.log(`✅ Loaded font: ${family} (from ${file})`);
      } catch (err) {
        console.warn(`⚠️  Failed to load font ${file}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error reading fonts directory: ${err.message}`);
  }

  DEFAULT_FONT = "sans-serif";
}

/**
 * Ensures a font is available locally and registered.
 * If not found, attempts to download it from Google Fonts.
 */
async function ensureFont(family, style = "normal", weight = "400") {
  if (!family || family.toLowerCase() === "sans-serif") return "sans-serif";
  
  // Normalize family for lookup and storage
  const variantSuffix = (style === "italic" ? " Italic" : "");
  // We don't distinguish weight in the family name usually unless it's a specific font file
  const fullRequestName = `${family}${variantSuffix}`;
  
  // 1. Check local repo fonts (read-only)
  const repoMatch = Array.from(availableFonts).find(f => f.toLowerCase() === fullRequestName.toLowerCase() || f.toLowerCase() === family.toLowerCase());
  if (repoMatch) return repoMatch;

  // 2. Check dynamic temp fonts (downloaded)
  const normalizedFile = fullRequestName.toLowerCase().replace(/\s+/g, '-');
  const tempFontPath = path.join(dynamicFontsDir, `${normalizedFile}.ttf`);
  if (fs.existsSync(tempFontPath)) {
    GlobalFonts.registerFromPath(tempFontPath, fullRequestName);
    availableFonts.add(fullRequestName);
    return fullRequestName;
  }

  console.log(`🔍 Font "${fullRequestName}" not found. Attempting to fetch from Google Fonts...`);

  try {
    // 1. Fetch CSS from Google Fonts
    // We try to request the specific variant if it's italic
    let googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`;
    if (style === "italic") {
      googleFontsUrl += `:ital@1`;
    }
    
    const response = await axios.get(googleFontsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // 2. Extract .ttf URL using regex
    // We look for the url() that matches the style if multiple are returned
    const ttfUrlMatch = response.data.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (!ttfUrlMatch) {
      throw new Error(`Could not find .ttf URL for font "${fullRequestName}" in Google Fonts CSS.`);
    }

    const ttfUrl = ttfUrlMatch[1];
    const fileName = `${normalizedFile}.ttf`;
    const fontPath = path.join(dynamicFontsDir, fileName);

    // 3. Download the .ttf file
    console.log(`📥 Downloading font: ${fullRequestName} from ${ttfUrl}`);
    const fontResponse = await axios.get(ttfUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(fontPath, fontResponse.data);

    // 4. Register the font
    GlobalFonts.registerFromPath(fontPath, fullRequestName);
    availableFonts.add(fullRequestName);
    if (!fontList.find(f => f.family === fullRequestName)) {
      fontList.push({ family: fullRequestName, file: fileName });
    }
    
    console.log(`✅ Dynamically loaded and cached font: ${fullRequestName}`);
    return fullRequestName;
  } catch (err) {
    console.error(`❌ Failed to fetch font "${fullRequestName}": ${err.message}`);
    return family; // Fallback to family name and hope canvas fakes it
  }
}

// --- CONFIGURATION CONSTANTS ---
const ACCESS_PERIOD_DAYS = 30; // Fallback default
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const PURCHASE_EMAIL_SERVICE = process.env.PURCHASE_EMAIL_SERVICE;
const PURCHASE_EMAIL_USER = process.env.PURCHASE_EMAIL_USER;
const PURCHASE_EMAIL_PASS = process.env.PURCHASE_EMAIL_PASS;
// -------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const HARD_BOUNCE_PATTERNS = [
  "550 5.1.1",
  "550-5.1.1",
  "user unknown",
  "recipient address rejected",
  "mailbox unavailable",
  "no such user",
  "mailbox not found",
];

const isValidEmailFormat = (email = "") => EMAIL_REGEX.test(email.trim());

const domainValidationCache = new Map();
const validateEmailDomain = async (email = "") => {
  const trimmed = email.trim();
  if (!isValidEmailFormat(trimmed)) {
    return { ok: false, reason: "Invalid email format." };
  }

  // Skip DNS check if configured
  if (process.env.SKIP_EMAIL_DNS_CHECK === "true") {
    return { ok: true };
  }

  const domain = trimmed.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { ok: false, reason: "Invalid email domain." };
  }

  if (domainValidationCache.has(domain)) {
    return domainValidationCache.get(domain);
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords?.length) {
      const result = { ok: true };
      domainValidationCache.set(domain, result);
      return result;
    }
  } catch (err) {
    // Continue to fallback A record check
  }

  try {
    await dns.resolve(domain);
    const result = { ok: true };
    domainValidationCache.set(domain, result);
    return result;
  } catch (err) {
    const failure = {
      ok: false,
      reason: "Email domain not found or unreachable. Please check for typos.",
    };
    domainValidationCache.set(domain, failure);
    return failure;
  }
};

const toTitleCase = (value = "") => {
  return value
    .toString()
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, (word) => {
      const [first = "", ...rest] = word;
      return first.toUpperCase() + rest.join("");
    });
};

const getBounceReason = (error = {}) => {
  const responseText = error?.response || error?.message || "";
  const combined = `${error?.code || ""} ${error?.responseCode || ""
    } ${responseText}`.toLowerCase();

  if (HARD_BOUNCE_PATTERNS.some((pattern) => combined.includes(pattern))) {
    return "Address not found. Please verify the email.";
  }

  if (
    error?.responseCode === 550 ||
    error?.code === "EENVELOPE" ||
    error?.code === "EADDRNOTAVAIL" ||
    error?.code === "ENOTFOUND"
  ) {
    return "Address not found. Please verify the email.";
  }

  return responseText || "Unknown error";
};

const DEFAULT_PAYMENT_AMOUNT = 50; // Fallback default
const ENFORCE_PAYMENT_BEFORE_SEND =
  (process.env.ENFORCE_PAYMENT_BEFORE_SEND || "false")
    .toString()
    .toLowerCase() !== "false";

// getServerBaseUrl is defined at the top now

const getClientBaseUrl = (req) => {
  if (CLIENT_BASE_URL) return CLIENT_BASE_URL.replace(/\/+$/, "");
  const host = req.get("host") || `localhost:${port}`;
  const protocol = req.protocol || "http";
  // If we're on the server port (likely 5000), default the client to 3000.
  if (host.includes(":5000") || host.endsWith(`:${port}`)) {
    return `${protocol}://localhost:3000`;
  }
  return `${protocol}://${host}`;
};

/**
 * Fixes filename encoding issues common with multer and non-ASCII characters.
 * Re-reads the string as UTF-8 from the mangled bytes.
 */
const fixFilenameEncoding = (filename = "") => {
  if (!filename) return "";
  try {
    // If the filename contains characters that look like mangled UTF-8 (e.g. à¦œà§ à¦²à¦¾à¦‡),
    // we attempt to fix it. This is a common workaround for multer/busboy.
    return Buffer.from(filename, 'binary').toString('utf8');
  } catch (err) {
    return filename;
  }
};

const generateTransactionId = () =>
  `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const redirectWithMessage = (res, url, message = "Redirecting...") => {
  const safeUrl = url || "/";
  const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  res
    .status(200)
    .send(
      `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta http-equiv="refresh" content="0;url=${safeUrl}" /><script>window.location.href=${JSON.stringify(
        safeUrl
      )};</script></head><body><p>${safeMessage}</p></body></html>`
    );
};


app.use("/fonts", express.static(fontsDir));
// Explicit font file route added below in the API section
// app.use("/uploads", express.static(uploadsDir)); // No longer needed for Cloudinary

app.post("/api/upload-image", uploadImage.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: "No image file uploaded." });
  }

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "certificate-studio-signatures",
    });

    // Cleanup local file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    res.json({
      message: "Image uploaded to Cloudinary successfully",
      url: result.secure_url,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).send({ message: "Failed to upload image to cloud." });
  }
});


// This route handles the root /api/fonts to return the list
app.get("/api/fonts", (req, res) => {
  res.json(fontList);
});

// Explicit route for font files to ensure they are served correctly
app.get("/api/fonts/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(fontsDir, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Font not found");
  }
});

const generateRandomPassword = () => uuidv4().slice(0, 8);

// --- AUTH ENDPOINT: Purchase Simulation & User Setup ---
app.post("/api/auth/verify-purchase", async (req, res) => {
  const { email, name, phone } = req.body;
  const trimmedEmail = (email || "").toString().trim();
  const trimmedName = (name || "").toString().trim();
  const trimmedPhone = (phone || "").toString().trim();

  if (!trimmedEmail || !isValidEmailFormat(trimmedEmail)) {
    return res
      .status(400)
      .send({ message: "A valid email address is required." });
  }
  if (!trimmedName) {
    return res
      .status(400)
      .send({ message: "Name is required to complete the purchase." });
  }
  if (!trimmedPhone) {
    return res
      .status(400)
      .send({ message: "Phone number is required to complete the purchase." });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (dbErr) {
    console.error("❌ Database connection failed during purchase request:", dbErr);
    return res.status(500).send({
      message: "Database connection failed. Please check if the database is running.",
    });
  }

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT u.id, ua.access_expires_at 
        FROM users u 
        LEFT JOIN user_access ua ON u.id = ua.user_id
        WHERE u.email = $1
      `,
      [trimmedEmail]
    );

    const existingUser = userResult.rows.length > 0 ? userResult.rows[0] : null;

    if (existingUser) {
      const expiresAt = existingUser.access_expires_at
        ? new Date(existingUser.access_expires_at)
        : null;

      // Only block if they aren't explicitly forcing a renewal
      if (expiresAt && expiresAt > new Date() && !req.body.forceRenew) {
        await client.query("ROLLBACK");
        return res.status(200).send({
          message:
            "You are already subscribed. Your access is currently active.",
          expiresAt: expiresAt.toISOString(),
          status: "active",
        });
      }
    }

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to process purchase verification:", error);
    return res.status(500).send({
      message: "Failed to process purchase verification.",
    });
  } finally {
    client.release();
  }

  const tranId = generateTransactionId();
  const baseUrl = getServerBaseUrl(req);
  const totalAmount =
    Number(req.body.totalAmount || req.body.amount) &&
      Number(req.body.totalAmount || req.body.amount) > 0
      ? Number(req.body.totalAmount || req.body.amount)
      : DEFAULT_PAYMENT_AMOUNT || 50;

  const paymentPayload = {
    total_amount: totalAmount,
    currency: "BDT",
    tran_id: tranId,
    success_url: `${baseUrl}/api/payments/success`,
    fail_url: `${baseUrl}/api/payments/fail`,
    cancel_url: `${baseUrl}/api/payments/cancel`,
    ipn_url: `${baseUrl}/api/payments/ipn`,
    shipping_method: "Courier",
    product_name: "Certificate Access",
    product_category: "Digital",
    product_profile: "general",
    cus_name: trimmedName,
    cus_email: trimmedEmail,
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: trimmedPhone,
    cus_fax: trimmedPhone,
    ship_name: trimmedName,
    ship_add1: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: "1000",
    ship_country: "Bangladesh",
  };

  if (!store_id || !store_passwd) {
    console.error("❌ Mising SSLCommerz credentials.");
    return res.status(500).send({ message: "Server misconfiguration: Missing payment credentials." });
  }

  try {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(paymentPayload);
    const GatewayPageURL = apiResponse?.GatewayPageURL;

    if (!GatewayPageURL) {
      console.error("❌ SSLCommerz Init Failed (No URL):", apiResponse);
      return res
        .status(500)
        .send({ message: "Payment Gateway Error: No URL returned.", details: apiResponse });
    }

    pendingPurchaseJobs.set(tranId, {
      email: trimmedEmail,
      name: trimmedName,
      phone: trimmedPhone,
      amount: totalAmount,
      days: parseInt(req.body.days, 10) || ACCESS_PERIOD_DAYS,
    });

    return res.status(200).send({
      status: "payment_pending",
      message:
        "Redirecting to payment to complete your purchase and receive your password.",
      paymentUrl: GatewayPageURL,
      tranId,
    });
  } catch (err) {
    console.error("❌ Payment initialization crashed:", err);
    return res.status(500).send({
      message: `Payment Error: ${err.message}`, // Exposing error to client for debugging
    });
  }
});
// --- AUTH ENDPOINT: Email/Password Login ---
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .send({ message: "Email and password are required." });
  }

  try {
    const userQuery =
      "SELECT u.id, u.display_name, u.password_hash, ua.access_expires_at, ua.is_active FROM users u JOIN user_access ua ON u.id = ua.user_id WHERE u.email = $1";
    const result = await pool.query(userQuery, [email]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .send({ message: "Invalid email or access has expired." });
    }

    const { id, display_name, password_hash, access_expires_at, is_active } = result.rows[0];

    // 1. Verify Password
    const passwordMatch = await bcrypt.compare(password, password_hash);
    if (!passwordMatch) {
      return res.status(401).send({ message: "Invalid password." });
    }

    // 2. Check Access Expiration
    const expiryDate = new Date(access_expires_at);
    if (expiryDate < new Date()) {
      if (is_active) {
        // Set to inactive so we don't spam the user every time they fail to log in
        await pool.query(
          "UPDATE user_access SET is_active = FALSE WHERE user_id = $1",
          [id]
        );
        
        // Send expiration email
        try {
          const transporter = nodemailer.createTransport({
            service: PURCHASE_EMAIL_SERVICE,
            auth: {
              user: PURCHASE_EMAIL_USER,
              pass: PURCHASE_EMAIL_PASS,
            },
          });
          const baseUrl = getClientBaseUrl(req);
          
          await transporter.sendMail({
            from: PURCHASE_EMAIL_USER,
            to: email,
            subject: "Your Certificate Studio Subscription Has Expired",
            html: `
              <h1>Subscription Expired</h1>
              <p>Hi ${display_name ? display_name.split(' ')[0] : 'there'},</p>
              <p>Your subscription to Certificate Studio expired on <strong>${expiryDate.toDateString()}</strong>.</p>
              <p>To continue using our services, please renew your subscription by logging in or visiting the pricing page.</p>
              <p><a href="${baseUrl}/pricing">Renew Subscription Now</a></p>
            `
          });
          console.log(`Expiration email sent to: ${email}`);
        } catch (emailErr) {
          console.error("Failed to send expiration email:", emailErr.message);
        }
      }

      return res.status(401).send({
        message: "Your access has expired. Please renew via the pricing page.",
      });
    }

    console.log(`User logged in: ${email}`);

    // Return a secure token (JWT) here in a real app. For this demo, we return email/expiry.
    return res.send({
      message: "Login successful.",
      email: email,
      // In a real app, use a long-lived, signed JWT here
      sessionToken: uuidv4(),
      accessExpires: expiryDate.toISOString(),
    });
  } catch (error) {
    console.error(
      "❌ Database or authentication error during login:",
      error.message
    );
    return res
      .status(500)
      .send({ message: "Internal server error during login." });
  }
});

// --- AUTH ENDPOINT: Change Password ---
app.post("/api/auth/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).send({ message: "All fields are required." });
  }

  try {
    // 1. Fetch user by email
    const userQuery = "SELECT id, password_hash FROM users WHERE email = $1";
    const result = await pool.query(userQuery, [email]);

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "User not found." });
    }

    const { id, password_hash } = result.rows[0];

    // 2. Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, password_hash);
    if (!passwordMatch) {
      return res.status(401).send({ message: "Incorrect current password." });
    }

    // 3. Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. Update password in database
    const updateQuery = "UPDATE users SET password_hash = $1 WHERE id = $2";
    await pool.query(updateQuery, [newPasswordHash, id]);

    console.log(`Password changed for user: ${email}`);
    return res.send({ message: "Password updated successfully." });
  } catch (error) {
    console.error("❌ Error changing password:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});

// --- AUTH ENDPOINT: Get Profile ---
app.get("/api/auth/profile/:email", async (req, res) => {
  const { email } = req.params;
  const trimmedEmail = (email || "").toString().trim();

  if (!trimmedEmail) {
    return res.status(400).send({ message: "Email is required." });
  }

  try {
    const result = await pool.query(
      `SELECT u.email, u.display_name as "displayName", u.phone, 
              ua.access_expires_at as "accessExpiresAt", ua.is_active as "isActive" 
       FROM users u 
       LEFT JOIN user_access ua ON u.id = ua.user_id 
       WHERE u.email = $1`,
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "User not found." });
    }

    return res.send(result.rows[0]);
  } catch (error) {
    console.error("❌ Error fetching profile:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});

// --- AUTH ENDPOINT: Update Profile ---
app.post("/api/auth/update-profile", async (req, res) => {
  const { email, displayName, phone } = req.body;
  const trimmedEmail = (email || "").toString().trim();

  if (!trimmedEmail) {
    return res.status(400).send({ message: "Email is required to identify user." });
  }

  try {
    const updateQuery = `
      UPDATE users 
      SET display_name = $1, phone = $2 
      WHERE email = $3 
      RETURNING display_name as "displayName", phone, email
    `;
    const result = await pool.query(updateQuery, [displayName, phone, trimmedEmail]);

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "User not found." });
    }

    return res.send({
      message: "Profile updated successfully.",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});

// --- AUTH ENDPOINT: Get Email Presets ---
app.get("/api/auth/presets/:email", async (req, res) => {
  const { email } = req.params;
  const trimmedEmail = (email || "").toString().trim();

  if (!trimmedEmail) {
    return res.status(400).send({ message: "Email is required." });
  }

  try {
    // Join with users table to get the user_id
    const query = `
      SELECT p.id, p.preset_type as "presetType", p.preset_name as "presetName", p.template_text as "templateText", p.signature_text as "signatureText"
      FROM email_presets p
      JOIN users u ON p.user_id = u.id
      WHERE u.email = $1
      ORDER BY p.created_at ASC
    `;
    const result = await pool.query(query, [trimmedEmail]);
    return res.send(result.rows);
  } catch (error) {
    console.error("❌ Error fetching presets:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});

// --- AUTH ENDPOINT: Save Email Preset ---
app.post("/api/auth/presets", async (req, res) => {
  const { email, presetType, presetName, templateText, signatureText } = req.body;
  const trimmedEmail = (email || "").toString().trim();
  const trimmedType = (presetType || "message").toString().trim();
  const trimmedName = (presetName || "").toString().trim();

  if (!trimmedEmail || !trimmedName || !trimmedType) {
    return res.status(400).send({ message: "Email, Preset Type, and Preset Name are required." });
  }

  try {
    // 1. Get user_id
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [trimmedEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).send({ message: "User not found." });
    }
    const userId = userResult.rows[0].id;

    // 2. Insert or Update preset (Upsert based on user_id, preset_type, and preset_name)
    const upsertQuery = `
      INSERT INTO email_presets (user_id, preset_type, preset_name, template_text, signature_text)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, preset_type, preset_name) 
      DO UPDATE SET template_text = EXCLUDED.template_text, signature_text = EXCLUDED.signature_text
      RETURNING id, preset_type as "presetType", preset_name as "presetName", template_text as "templateText", signature_text as "signatureText"
    `;
    const result = await pool.query(upsertQuery, [userId, trimmedType, trimmedName, templateText || "", signatureText || ""]);

    return res.send({
      message: "Preset saved successfully.",
      preset: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error saving preset:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});

// --- AUTH ENDPOINT: Delete Email Preset ---
app.delete("/api/auth/presets/:id", async (req, res) => {
  const presetId = req.params.id;

  try {
    const result = await pool.query("DELETE FROM email_presets WHERE id = $1 RETURNING id", [presetId]);
    
    if (result.rows.length === 0) {
       return res.status(404).send({ message: "Preset not found." });
    }
    
    return res.send({ message: "Preset deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting preset:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});

// --- OTP Password Reset Stores ---
const otpStore = new Map();      // email -> { otp, expiresAt }
const resetTokenStore = new Map(); // email -> { token, expiresAt }
const OTP_TTL_MS = 2 * 60 * 1000;       // 2 minutes
const RESET_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

const generateOTP = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
};

// --- AUTH ENDPOINT: Forgot Password (Send OTP) ---
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  const trimmedEmail = (email || "").toString().trim();

  if (!trimmedEmail || !isValidEmailFormat(trimmedEmail)) {
    return res.status(400).send({ message: "A valid email address is required." });
  }

  try {
    // Check if user exists
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [trimmedEmail]);
    if (result.rows.length === 0) {
      return res.status(404).send({ message: "No account found with this email. Please sign up first." });
    }

    // Generate OTP and store it
    const otp = generateOTP();
    otpStore.set(trimmedEmail, {
      otp,
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    // Send OTP email
    const transporter = nodemailer.createTransport({
      service: PURCHASE_EMAIL_SERVICE,
      auth: {
        user: PURCHASE_EMAIL_USER,
        pass: PURCHASE_EMAIL_PASS,
      },
    });

    const emailBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
        <h2 style="color: #3b0ea6; margin-top: 0;">Password Reset OTP</h2>
        <p style="color: #374151;">You requested a password reset. Use the OTP below to verify your identity:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; background: linear-gradient(135deg, #6d28d9, #3b82f6); color: #fff; padding: 16px 32px; border-radius: 12px;">
            ${otp}
          </span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">⏱️ This OTP is valid for <strong>2 minutes</strong> only.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: PURCHASE_EMAIL_USER,
      to: trimmedEmail,
      subject: "Password Reset OTP — Certificate Studio",
      html: emailBody,
    });

    console.log(`OTP sent to: ${trimmedEmail}`);
    return res.send({ message: "If this email is registered, an OTP has been sent." });
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    return res.status(500).send({ message: "Failed to send OTP. Please try again." });
  }
});

// --- AUTH ENDPOINT: Verify OTP ---
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const trimmedEmail = (email || "").toString().trim();
  const trimmedOtp = (otp || "").toString().trim().toUpperCase();

  if (!trimmedEmail || !trimmedOtp) {
    return res.status(400).send({ message: "Email and OTP are required." });
  }

  const stored = otpStore.get(trimmedEmail);

  if (!stored) {
    return res.status(400).send({ message: "No OTP found. Please request a new one." });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(trimmedEmail);
    return res.status(400).send({ message: "OTP has expired. Please request a new one." });
  }

  if (stored.otp !== trimmedOtp) {
    return res.status(400).send({ message: "Incorrect OTP. Please try again." });
  }

  // OTP is valid — generate a one-time reset token
  otpStore.delete(trimmedEmail);
  const resetToken = uuidv4();
  resetTokenStore.set(trimmedEmail, {
    token: resetToken,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });

  console.log(`OTP verified for: ${trimmedEmail}`);
  return res.send({ message: "OTP verified successfully.", resetToken });
});

// --- AUTH ENDPOINT: Reset Password (after OTP verified) ---
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  const trimmedEmail = (email || "").toString().trim();

  if (!trimmedEmail || !resetToken || !newPassword) {
    return res.status(400).send({ message: "All fields are required." });
  }

  const stored = resetTokenStore.get(trimmedEmail);

  if (!stored || stored.token !== resetToken) {
    return res.status(400).send({ message: "Invalid or expired reset session. Please start over." });
  }

  if (Date.now() > stored.expiresAt) {
    resetTokenStore.delete(trimmedEmail);
    return res.status(400).send({ message: "Reset session has expired. Please start over." });
  }

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [newPasswordHash, trimmedEmail]);
    resetTokenStore.delete(trimmedEmail);

    console.log(`Password reset for: ${trimmedEmail}`);
    return res.send({ message: "Password has been reset successfully. You can now log in." });
  } catch (error) {
    console.error("❌ Error resetting password:", error.message);
    return res.status(500).send({ message: "Internal server error." });
  }
});
// -------------------------------------------------------------

// --- Authorization Middleware (Used for protected routes) ---
// This is a placeholder/example of how you would protect your generate endpoints
const checkAccess = async (req, res, next) => {
  // In a production app, you would validate a JWT token here, fetch user ID,
  // and check the 'user_access' table.

  // Since the client currently stores email/token in localStorage,
  // we'll skip complex middleware validation for this demo and assume
  // access is controlled by successful login, but you MUST implement
  // proper session or token validation in a real app.

  // If you implemented JWTs, this is where you'd check its validity and expiry.

  return next();
};
// -----------------------------------------------------------

const weightMap = {
  bold: "700",
  normal: "400",
};

const ALIGN_TO_X = {
  left: (x) => x,
  center: (x, width) => x + width / 2,
  right: (x, width) => x + width,
};

const CANVAS_TEXT_ALIGN = {
  left: "left",
  center: "center",
  right: "right",
};

const MIN_DYNAMIC_FONT_SIZE = 8;
const FONT_FIT_PADDING = 0.9;
const GOLDEN_BORDER_PADDING = 20;


const fitFontSizeToBox = (
  ctx,
  text,
  fontFamily,
  desiredSize,
  boxWidth,
  boxHeight,
  fontWeight = "normal",
  fontStyle = "normal"
) => {
  let size = Math.max(MIN_DYNAMIC_FONT_SIZE, Number(desiredSize) || 0);
  const safeText = text?.toString() || "";
  const iterations = 12;

  const weightMap = {
    bold: "700",
    normal: "400",
  };
  const numericWeight =
    weightMap[fontWeight] || fontWeight || "400";
  let style = fontStyle || "normal";

  let effectiveFontFamily = fontFamily;
  if (style === "italic" && fontFamily === "Libre Baskerville") {
    // Assuming availableFonts isn't easily accessible here or we trust it exists because drawText checks it.
    // But fitFontSizeToBox is pure, so we might need to assume it's available if we are here.
    // However, let's just do the string check for checking availability 
    // or just blind switch if we are confident.
    // Better to be consistent with drawTextOnCanvas logic.
    effectiveFontFamily = "Libre Baskerville Italic";
    style = "normal";
  }

  for (let i = 0; i < iterations; i++) {
    ctx.font = `${style} ${numericWeight} ${size}px "${effectiveFontFamily}"`;
    const metrics = ctx.measureText(safeText);
    const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
    const descent = metrics.actualBoundingBoxDescent || size * 0.2;
    const left = Math.abs(metrics.actualBoundingBoxLeft || 0);
    const right = Math.abs(metrics.actualBoundingBoxRight || 0);
    const width = left + right || metrics.width || 0;
    const height = ascent + descent;

    const allowedWidth =
      Math.max(1, boxWidth - GOLDEN_BORDER_PADDING * 2) * FONT_FIT_PADDING;
    const allowedHeight = Math.max(1, boxHeight) * FONT_FIT_PADDING;

    const widthRatio = width ? allowedWidth / width : 1;
    const heightRatio = height ? allowedHeight / height : 1;
    const ratio = Math.min(widthRatio, heightRatio);

    if (ratio >= 1) {
      break;
    }

    const nextSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.floor(size * Math.max(0.1, ratio))
    );

    if (nextSize >= size) {
      size = Math.max(MIN_DYNAMIC_FONT_SIZE, size - 1);
    } else {
      size = nextSize;
    }

    if (size <= MIN_DYNAMIC_FONT_SIZE) {
      break;
    }
  }

  return size;
};

const sanitizeFileName = (value = "", fallback = "certificate") => {
  return (
    value
      .toString()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
};

const stripExtension = (filename = "") => filename.replace(/\.[^/.]+$/, "");

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const normalized = value.toString().trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  return defaultValue;
};

const chunkArray = (arr = [], size = 1) => {
  if (!Array.isArray(arr) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const NAME_TOKEN_REGEX = /{{\s*name\s*}}|{\s*name\s*}/gi;
const EMAIL_TOKEN_REGEX = /{{\s*email\s*}}|{\s*email\s*}/gi;
const DEFAULT_EMAIL_TEMPLATE = `Hi {name},

Congratulations! Your certificate is attached.

Warmly,
Your Certificate Team`;

const buildEmailBodies = (template = "", name = "", email = "") => {
  const safeName = name || "";
  const safeEmail = email || "";
  const baseTemplate = template?.toString() || DEFAULT_EMAIL_TEMPLATE;
  const populated = baseTemplate
    .replace(NAME_TOKEN_REGEX, safeName)
    .replace(EMAIL_TOKEN_REGEX, safeEmail);
  return {
    text: populated,
    html: populated.replace(/\r?\n/g, "<br />"),
  };
};

const getColumnValue = (row = {}, columnName = "") => {
  if (!row || !columnName) return "";
  if (Object.prototype.hasOwnProperty.call(row, columnName)) {
    return row[columnName];
  }

  const normalizedColumn = columnName.toString().trim().toLowerCase();
  const keys = Object.keys(row);

  // 1. Try exact normalized match first
  let resolvedKey = keys.find(
    (key) => key?.toString().trim().toLowerCase() === normalizedColumn
  );

  // 2. If no exact match and seeking "name" or "email", try substring match
  if (typeof resolvedKey === "undefined" && (normalizedColumn === "name" || normalizedColumn === "email")) {
    resolvedKey = keys.find((key) => {
      const k = key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      return k.includes(normalizedColumn);
    });
  }

  return typeof resolvedKey === "undefined" ? "" : row[resolvedKey];
};

async function drawTextOnCanvas(
  templateBuffer,
  layout,
  fullName,
  options = {}
) {
  const { drawName = true } = options;
  const templateImage = await loadImage(templateBuffer);
  const { width: templateWidth, height: templateHeight } = templateImage;

  const canvas = createCanvas(templateWidth, templateHeight);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(templateImage, 0, 0, templateWidth, templateHeight);

  if (!drawName) {
    return canvas.encode("png");
  }

  if (!layout) {
    throw new Error("Layout is required to draw recipient names.");
  }

  const baseX = Number(layout.x) || 0;
  const baseY = Number(layout.y) || 0;
  const boxWidth = Math.max(1, Number(layout.width) || templateWidth);
  const boxHeight = Math.max(1, Number(layout.height) || templateHeight);
  const fontSize = Math.max(8, Number(layout.fontSize) || 48);

  const align = layout.align || "center";
  const vAlign = layout.v_align || "middle";
  const fillStyle = layout.color || "#000000";
  const numericWeight = weightMap[layout.fontWeight] || layout.fontWeight || "400";
  let style = layout.fontStyle || "normal";

  // Ensure font is loaded with correct variant if possible
  const effectiveFontFamily = await ensureFont(layout.fontFamily, style, numericWeight);

  const appliedFontSize = fitFontSizeToBox(
    ctx,
    fullName,
    effectiveFontFamily,
    fontSize,
    boxWidth,
    boxHeight,
    numericWeight,
    style
  );

  console.log(
    `Drawing with: ${style} ${numericWeight} ${appliedFontSize}px "${effectiveFontFamily}", Color: ${fillStyle}`
  );

  ctx.font = `${style} ${numericWeight} ${appliedFontSize}px "${effectiveFontFamily}"`;
  ctx.fillStyle = fillStyle;
  ctx.textAlign = CANVAS_TEXT_ALIGN[align] || "center";

  const anchorX = (ALIGN_TO_X[align] || ALIGN_TO_X.center)(
    baseX,
    Math.max(1, boxWidth)
  );

  const metrics = ctx.measureText(fullName);
  const ascent = metrics.actualBoundingBoxAscent || 0;
  const descent = metrics.actualBoundingBoxDescent || 0;

  let anchorY;
  if (vAlign === "top") {
    ctx.textBaseline = "top";
    anchorY = baseY;
  } else if (vAlign === "bottom") {
    ctx.textBaseline = "bottom";
    anchorY = baseY + boxHeight;
  } else {
    ctx.textBaseline = "middle";
    anchorY = baseY + boxHeight / 2;
  }

  ctx.save();
  ctx.beginPath();
  // Adding a slight buffer to the clipping rect to avoid edge artifacts
  ctx.rect(baseX - 1, baseY - 1, boxWidth + 2, boxHeight + 2);
  ctx.clip();
  ctx.fillText(fullName, anchorX, anchorY);
  ctx.restore();

  return canvas.encode("png");
}

async function drawTextOnPDF(
  templateBuffer,
  layout,
  fullName,
  options = {}
) {
  // 1. Render exactly what's on the preview to a canvas buffer
  const pngBuffer = await drawTextOnCanvas(
    templateBuffer,
    layout,
    fullName,
    options
  );

  // 2. Load the template image to get dimensions
  const templateImage = await loadImage(templateBuffer);
  const { width, height } = templateImage;
  const orientation = width > height ? "l" : "p";

  // 3. Create PDF with same dimensions
  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
  });

  // 4. Add the rendered canvas image to the PDF
  doc.addImage(pngBuffer, "PNG", 0, 0, width, height, undefined, "FAST");

  return Buffer.from(doc.output("arraybuffer"));
}

const sendEmailBatch = async (job = {}) => {
  const {
    recipients = [],
    attachmentMode,
    personalizeWithNames,
    layout,
    templateBuffer,
    templateFilename,
    templateBaseName,
    templateMimeType,
    sharedAttachmentFiles = [],
    emailConfig = {},
    missingEmailRecipients = [],
    totalRows = 0,
    jobId = null, // New: Job ID for tracking
  } = job;

  const {
    emailService,
    emailUser,
    emailPass,
    senderName,
    emailSubject,
    emailTemplate,
  } = emailConfig;

  if (!recipients.length) {
    return {
      error: {
        status: 400,
        message: "No recipients found for this transaction.",
      },
    };
  }

  if (!emailService || !emailUser || !emailPass) {
    return {
      error: {
        status: 400,
        message:
          "Email service, address, and app password are required to send certificates.",
      },
    };
  }

  const transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const formattedFrom =
    senderName && senderName.trim().length
      ? `"${senderName.trim()}" <${emailUser}>`
      : emailUser;
  const subject =
    emailSubject && emailSubject.trim().length
      ? emailSubject.trim()
      : "Your Certificate";
  const templateCopy =
    emailTemplate && emailTemplate.trim().length
      ? emailTemplate
      : DEFAULT_EMAIL_TEMPLATE;
  const templateHasNameToken = NAME_TOKEN_REGEX.test(templateCopy);
  NAME_TOKEN_REGEX.lastIndex = 0;

  // Always send emails individually to support placeholders like {name}
  // even for shared attachments. The user specifically requested to avoid BCC.
  const failures = [];
  let successCount = 0;


  for (const recipient of recipients) {
    try {
      const bodies = buildEmailBodies(templateCopy, recipient.name, recipient.email);
      const safeName = sanitizeFileName(recipient.name, "certificate");
      let attachments = [];

      if (attachmentMode === "shared" && sharedAttachmentFiles.length > 0) {
        attachments = sharedAttachmentFiles.map((file) => ({
          filename: file.originalname,
          content: file.content, // Now mapped to content by the caller
          contentType: file.mimetype,
        }));
      } else if (attachmentMode === "certificate") {
        if (personalizeWithNames) {
          const pdfBuffer = await drawTextOnPDF(
            templateBuffer,
            layout,
            recipient.name,
            { drawName: true }
          );
          attachments = [
            {
              filename: `${safeName}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ];
        } else {
          const pdfBuffer = await drawTextOnPDF(
            templateBuffer,
            layout,
            "",
            { drawName: false }
          );
          attachments = [
            {
              filename: templateFilename || `${templateBaseName}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ];
        }
      }

      await transporter.sendMail({
        from: formattedFrom,
        to: recipient.email,
        subject,
        text: bodies.text,
        html: bodies.html,
        attachments,
      });

      successCount += 1;
      console.log(
        `[OK] Sent certificate to ${recipient.name} (${recipient.email}).`
      );
    } catch (error) {
      console.error(
        `❌ Failed to send certificate to ${recipient.name} (${recipient.email}).`,
        error.message
      );

      if (error?.code === "EAUTH" || error?.responseCode === 535) {
        return {
          error: {
            status: 400,
            message:
              "Email provider rejected the credentials. Please verify the email address, selected service, and app password.",
          },
        };
      }

      if (
        error?.responseCode === 550 ||
        error?.code === "EENVELOPE" ||
        error?.code === "EADDRNOTAVAIL" ||
        error?.code === "ENOTFOUND"
      ) {
        return {
          error: {
            status: 400,
            message: `Address not found for ${recipient.email}. Please verify the email and try again.`,
          },
        };
      }

      failures.push({
        name: recipient.name,
        email: recipient.email,
        reason: getBounceReason(error),
      });
    }

    // Update Progress
    if (jobId && activeJobs.has(jobId)) {
      const currentJob = activeJobs.get(jobId);
      currentJob.successCount = successCount;
      currentJob.failureCount = failures.length;
      currentJob.processed = successCount + failures.length;
    }
  }

  const status = failures.length
    ? successCount
      ? "partial_failure"
      : "failed"
    : "success";

  const payload = {
    message:
      status === "success"
        ? `Emails sent successfully to all ${recipients.length} recipient${recipients.length === 1 ? "" : "s"
        }.`
        : status === "partial_failure"
          ? `Some emails failed (${failures.length}/${recipients.length}). First error: ${failures[0].reason}`
          : `All emails failed. First error: ${failures[0]?.reason || "Unknown error"
          }`,
    status,
    successCount,
    failureCount: failures.length,
    missingEmailCount: missingEmailRecipients.length || 0,
    totalRows: totalRows || recipients.length,
    attempted: recipients.length,
    failures,
  };

  const httpStatus = failures.length === 0 ? 200 : successCount ? 207 : 400;

  return { payload, httpStatus };
};

const sendPendingJobByTranId = async (tranId) => {
  if (!tranId) {
    return {
      error: { status: 400, message: "Transaction ID is required." },
    };
  }

  const job = pendingEmailJobs.get(tranId);
  if (!job?.emailJob) {
    return {
      error: {
        status: 404,
        message: "No pending email job found for this transaction.",
      },
    };
  }

  const result = await sendEmailBatch(job.emailJob);
  if (!result.error) {
    pendingEmailJobs.delete(tranId);
  }
  return result;
};

app.post(
  "/api/generate",
  checkAccess, // Protected Route
  rejectIfTooLarge,
  upload.fields([
    { name: "templateImage", maxCount: 1 },
    { name: "dataFile", maxCount: 1 },
  ]),
  async (req, res, next) => {
    console.log("Received layout:", req.body.layout);

    try {
      if (!req.files?.templateImage?.[0] || !req.files?.dataFile?.[0]) {
        return res
          .status(400)
          .send({ message: "Template image and data file are required." });
      }

      const personalizeWithNames = parseBoolean(
        req.body.personalizeWithNames,
        true
      );

      let layout = null;
      if (personalizeWithNames) {
        try {
          layout = JSON.parse(req.body.layout || "{}");
        } catch {
          return res
            .status(400)
            .send({ message: "Layout payload is not valid JSON." });
        }

        if (!layout || Object.keys(layout).length === 0) {
          return res.status(400).send({
            message: "A locked layout is required before generating.",
          });
        }
      } else if (req.body.layout) {
        try {
          layout = JSON.parse(req.body.layout);
        } catch {
          layout = null;
        }
      }

      const templateFile = req.files.templateImage[0];
      const dataFile = req.files.dataFile[0];

      const templateBuffer = fs.readFileSync(templateFile.path);
      const workbook = XLSX.readFile(dataFile.path);
      const firstSheetName = workbook.SheetNames?.[0] || "";
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        return res
          .status(400)
          .send({ message: "No sheets found in the Excel file." });
      }
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (!rows.length) {
        return res.status(400).send({ message: "No rows found in the sheet." });
      }

      const zip = new JSZip();
      const nameCounter = {};

      const generationPromises = rows.map(async (row) => {
        const fullName = toTitleCase(row.Name || "");
        if (!fullName) return null;

        const pdfBuffer = await drawTextOnPDF(
          templateBuffer,
          layout,
          fullName,
          { drawName: personalizeWithNames }
        );

        const safeName = sanitizeFileName(fullName);
        return { safeName, pdfBuffer };
      });

      const generatedImages = await Promise.all(generationPromises);

      let filesWritten = 0;
      for (const imgData of generatedImages) {
        if (!imgData) continue;
        const { safeName, pdfBuffer } = imgData;
        nameCounter[safeName] = (nameCounter[safeName] || 0) + 1;
        const uniqueName =
          nameCounter[safeName] > 1
            ? `${safeName}-${nameCounter[safeName]}`
            : safeName;
        zip.file(`${uniqueName}.pdf`, pdfBuffer);
        filesWritten += 1;
      }

      if (filesWritten === 0) {
        return res.status(400).send({
          message:
            'No certificates could be generated. Ensure your Excel file has a "Name" column with at least one value.',
        });
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const uploadedName =
        req.files?.dataFile?.[0]?.originalname?.replace(/\.[^/.]+$/, "") || "";
      const zipBaseName = sanitizeFileName(
        firstSheetName || uploadedName || "certificates",
        uploadedName || "certificates"
      );

      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=${zipBaseName}.zip`);
      res.send(zipBuffer);
      console.log(`✅ ZIP sent with ${filesWritten} files.`);
      cleanupReqFiles(req);
    } catch (error) {
      cleanupReqFiles(req);
      return next(error);
    }
  }
);

app.post(
  "/api/generate-and-send",
  checkAccess, // Protected Route
  rejectIfTooLarge,
  upload.fields([
    { name: "templateImage", maxCount: 1 },
    { name: "dataFile", maxCount: 1 },
    { name: "sharedAttachment", maxCount: 10 },
  ]),
  async (req, res, next) => {
    console.log("Received generate-and-send request.");

    try {
      const attachmentMode = req.body.attachmentMode || "certificate";
      const sharedAttachmentFiles = req.files?.sharedAttachment || [];
      const personalizeWithNames = parseBoolean(
        req.body.personalizeWithNames,
        true
      );

      let layout = null;
      if (attachmentMode === "certificate") {
        if (personalizeWithNames) {
          try {
            layout = JSON.parse(req.body.layout || "{}");
          } catch {
            return res
              .status(400)
              .send({ message: "Layout payload is not valid JSON." });
          }

          if (!layout || Object.keys(layout).length === 0) {
            return res
              .status(400)
              .send({ message: "A locked layout is required before sending." });
          }
        } else if (req.body.layout) {
          try {
            layout = JSON.parse(req.body.layout);
          } catch {
            layout = null;
          }
        }

        if (!req.files?.templateImage?.[0]) {
          return res.status(400).send({
            message: "Template image is required for certificate mode.",
          });
        }
      } else if (
        attachmentMode === "shared" &&
        sharedAttachmentFiles.length === 0
      ) {
        return res.status(400).send({
          message:
            "At least one shared file is required for shared attachment mode.",
        });
      }

      const emailServiceInput = req.body.emailService || "";
      const emailUserInput = req.body.emailUser || "";
      const emailPassInput = req.body.emailPass || "";
      const senderNameInput = req.body.senderName || "";
      const emailSubjectInput = req.body.emailSubject || "";
      const emailTemplateInput = req.body.emailTemplate || "";

      const emailService = emailServiceInput.toString().trim();
      const emailUser = emailUserInput.toString().trim();
      const emailPass = emailPassInput.toString().trim();
      const senderName = senderNameInput.toString();
      const emailSubject = emailSubjectInput.toString();
      const emailTemplate = emailTemplateInput.toString();

      if (!emailService || !emailUser || !emailPass) {
        return res.status(400).send({
          message:
            "Email service, address, and app password are required to send certificates.",
        });
      }

      let templateBuffer = null;
      let templateFilename = "certificate.png";
      let templateMimeType = "image/png";
      let templateBaseName = "certificate";

      if (attachmentMode === "certificate") {
        const templateFile = req.files.templateImage[0];
        templateBuffer = fs.readFileSync(templateFile.path); // Read from disk
        const originalName = templateFile.originalname || "certificate.png";
        templateFilename = sanitizeFileName(originalName, "certificate.png");
        templateBaseName = sanitizeFileName(
          stripExtension(originalName),
          "certificate"
        );
        templateMimeType =
          templateFile.mimetype ||
          (originalName.toLowerCase().endsWith(".png")
            ? "image/png"
            : "application/octet-stream");
      }

      let rows = [];
      if (req.files?.dataFile?.[0]) {
        const dataFile = req.files.dataFile[0];
        const workbook = XLSX.readFile(dataFile.path); // Read directly from path
        const firstSheetName = workbook.SheetNames?.[0] || "";
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          return res
            .status(400)
            .send({ message: "No sheets found in the Excel file." });
        }

        rows = XLSX.utils.sheet_to_json(worksheet);
        if (!rows.length) {
          return res
            .status(400)
            .send({ message: "No rows found in the Excel sheet." });
        }
      }

      const missingEmailRecipients = [];

      const manualRecipients = [];
      if (req.body.manualRecipients) {
        try {
          const parsedManual = JSON.parse(req.body.manualRecipients);
          if (Array.isArray(parsedManual)) {
            for (const entry of parsedManual) {
              const manualName = toTitleCase(
                (entry?.name || "").toString().trim()
              );
              const manualEmail = (entry?.email || "").toString().trim();
              if (
                !manualName ||
                !manualEmail ||
                !isValidEmailFormat(manualEmail)
              ) {
                missingEmailRecipients.push(
                  manualName || entry?.name || "Manual Recipient"
                );
                continue;
              }
              manualRecipients.push({ name: manualName, email: manualEmail });
            }
          }
        } catch (err) {
          return res
            .status(400)
            .send({ message: "Manual recipients payload is not valid JSON." });
        }
      }

      const excelRecipients = rows
        .map((row) => {
          const fullName = toTitleCase(getColumnValue(row, "Name") || "");
          if (!fullName) return null;

          const emailValue = (getColumnValue(row, "Email") || "")
            .toString()
            .trim();
          if (!emailValue || !isValidEmailFormat(emailValue)) {
            missingEmailRecipients.push(fullName);
            return null;
          }

          return { name: fullName, email: emailValue };
        })
        .filter(Boolean);

      let recipients = [...excelRecipients, ...manualRecipients];

      // Deduplicate if requested
      const skipDuplicates = parseBoolean(req.body.skipDuplicates, false);
      if (skipDuplicates) {
        const seenEmails = new Set();
        recipients = recipients.filter(recipient => {
          const email = (recipient.email || "").toString().trim().toLowerCase();
          if (!email || seenEmails.has(email)) return false;
          seenEmails.add(email);
          return true;
        });
      }

      if (!recipients.length) {
        return res.status(400).send({
          message:
            'No recipients with both "Name" and "Email" were found. Please update your Excel sheet or the manual entries and try again.',
          missingEmailCount: missingEmailRecipients.length,
        });
      }

      const invalidRecipients = [];
      for (const recipient of recipients) {
        const validation = await validateEmailDomain(recipient.email || "");
        if (!validation.ok) {
          invalidRecipients.push({
            name: recipient.name,
            email: recipient.email,
            reason: validation.reason || "Invalid email address.",
          });
        }
      }

      if (invalidRecipients.length) {
        return res.status(400).send({
          message:
            invalidRecipients.length === 1
              ? `Invalid email: ${invalidRecipients[0].email}. ${invalidRecipients[0].reason}`
              : "One or more email addresses are invalid or unreachable. Please fix them and try again.",
          invalidEmails: invalidRecipients,
          missingEmailCount: missingEmailRecipients.length,
          status: "failed",
        });
      }

      const emailJob = {
        recipients,
        attachmentMode,
        personalizeWithNames,
        layout,
        templateBuffer,
        templateFilename,
        templateBaseName,
        templateMimeType,
        sharedAttachmentFiles: sharedAttachmentFiles.map(f => ({
          originalname: f.originalname,
          content: fs.readFileSync(f.path),
          mimetype: f.mimetype
        })),
        emailConfig: {
          emailService,
          emailUser,
          emailPass,
          senderName,
          emailSubject,
          emailTemplate,
        },
        missingEmailRecipients,
        totalRows: rows.length,
      };

      const paymentRequired =
        ENFORCE_PAYMENT_BEFORE_SEND ||
        parseBoolean(req.body.requirePayment, false);

      if (paymentRequired) {
        const tranId =
          (req.body.tran_id && req.body.tran_id.toString().trim()) ||
          generateTransactionId();
        const baseUrl = getServerBaseUrl(req);
        const totalAmount =
          Number(req.body.totalAmount) ||
          Number(req.body.total_amount) ||
          DEFAULT_PAYMENT_AMOUNT;

        const paymentPayload = {
          total_amount: totalAmount || DEFAULT_PAYMENT_AMOUNT,
          currency: "BDT",
          tran_id: tranId,
          success_url: `${baseUrl}/api/payments/success`,
          fail_url: `${baseUrl}/api/payments/fail`,
          cancel_url: `${baseUrl}/api/payments/cancel`,
          ipn_url: `${baseUrl}/api/payments/ipn`,
          shipping_method: "Courier",
          product_name: "Certificate Access",
          product_category: "Digital",
          product_profile: "general",
          cus_name: req.body.cus_name || senderName || "Customer",
          cus_email: req.body.cus_email || emailUser,
          cus_add1: req.body.cus_add1 || "Dhaka",
          cus_city: req.body.cus_city || "Dhaka",
          cus_state: req.body.cus_state || "Dhaka",
          cus_postcode: req.body.cus_postcode || "1000",
          cus_country: req.body.cus_country || "Bangladesh",
          cus_phone: req.body.cus_phone || "00000000000",
          cus_fax: req.body.cus_fax || "00000000000",
          ship_name: req.body.ship_name || senderName || "Customer",
          ship_add1: req.body.ship_add1 || "Dhaka",
          ship_city: req.body.ship_city || "Dhaka",
          ship_state: req.body.ship_state || "Dhaka",
          ship_postcode: req.body.ship_postcode || "1000",
          ship_country: req.body.ship_country || "Bangladesh",
        };

        try {
          const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
          const apiResponse = await sslcz.init(paymentPayload);
          const GatewayPageURL = apiResponse?.GatewayPageURL;
          if (!GatewayPageURL) {
            return res
              .status(500)
              .send({ message: "Failed to initialize payment gateway." });
          }

          pendingEmailJobs.set(tranId, {
            emailJob,
            createdAt: Date.now(),
          });

          return res.status(202).send({
            status: "payment_pending",
            message:
              "Payment required to send certificates. Redirect to complete payment.",
            paymentUrl: GatewayPageURL,
            tranId,
          });
        } catch (err) {
          console.error("Payment initialization failed:", err);
          return res.status(500).send({
            message: "Failed to start payment. Please try again.",
          });
        }
      }

      // Init Job
      const jobId = uuidv4();
      activeJobs.set(jobId, {
        status: 'running',
        processed: 0,
        total: emailJob.recipients.length,
        successCount: 0,
        failureCount: 0,
        payload: null
      });

      // Start Background Job
      sendEmailBatch({ ...emailJob, jobId })
        .then(({ payload, error }) => {
          const job = activeJobs.get(jobId);
          if (job) {
            job.status = error ? 'failed' : 'completed';
            job.payload = payload; // Store final payload
            if (error) job.error = error;
          }
        })
        .catch(err => {
          const job = activeJobs.get(jobId);
          if (job) {
            job.status = 'failed';
            job.error = { message: err.message };
          }
        });

      // Return Job ID immediately
      return res.status(202).send({
        status: "processing",
        message: "Email sending started in background.",
        jobId,
        totalRecipients: emailJob.recipients.length
      });
      
      // Cleanup files after starting background job
      // Note: We already read the buffers into the emailJob object above
      cleanupReqFiles(req);
    } catch (error) {
      cleanupReqFiles(req);
      return next(error);
    }
  }
);

// --- SHARED FILE OPTIMIZATION ENDPOINTS ---
app.post("/api/attachments/sign-upload", checkAccess, async (req, res) => {
  try {
    const signature = buildAttachmentUploadSignature({
      filename: sanitizeFileName(req.body?.filename || "attachment.pdf"),
      purpose: req.body?.purpose,
    });
    return res.status(200).send(signature);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

app.post("/api/attachments/cleanup", checkAccess, async (req, res) => {
  try {
    const attachments = Array.isArray(req.body?.attachments)
      ? req.body.attachments
      : [];
    await destroyRemoteAttachments(attachments);
    return res.status(200).send({ status: "success" });
  } catch (error) {
    return res.status(500).send({ message: "Failed to clean up attachments." });
  }
});

app.get("/api/attachments/cleanup-expired", async (req, res) => {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    const result = await cleanupExpiredRemoteAttachments();
    return res.status(200).send({
      status: "success",
      ...result,
      maxAge: DEFAULT_ATTACHMENT_CLEANUP_MAX_AGE,
    });
  } catch (error) {
    console.error("Expired attachment cleanup failed:", error);
    return res
      .status(500)
      .send({ message: "Failed to clean up expired attachments." });
  }
});

app.post(
  "/api/upload-shared",
  checkAccess,
  upload.array("attachments"),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).send({ message: "No files provided." });
      }

      const sharedBatchId = uuidv4();
      const files = req.files.map((file) => ({
        filename: fixFilenameEncoding(file.originalname),
        content: fs.readFileSync(file.path),
        contentType: file.mimetype,
      }));

      sharedFileStore.set(sharedBatchId, files);

      // Auto-cleanup after 1 hour (fallback)
      setTimeout(() => {
        if (sharedFileStore.has(sharedBatchId)) {
          sharedFileStore.delete(sharedBatchId);
          console.log(`[CMS] Auto-cleaned shared batch: ${sharedBatchId}`);
        }
      }, 60 * 60 * 1000);

      console.log(
        `[CMS] Uploaded shared batch: ${sharedBatchId} (${files.length} files)`
      );
      
      cleanupReqFiles(req);
      return res.status(200).send({ sharedBatchId });
    } catch (error) {
      cleanupReqFiles(req);
      console.error("Shared upload failed:", error);
      return res
        .status(500)
        .send({ message: "Failed to upload shared files." });
    }
  }
);

app.post("/api/cleanup-shared", checkAccess, async (req, res) => {
  const { sharedBatchId } = req.body;
  if (sharedBatchId && sharedFileStore.has(sharedBatchId)) {
    sharedFileStore.delete(sharedBatchId);
    console.log(`[CMS] Cleaned shared batch: ${sharedBatchId}`);
  }
  return res.status(200).send({ status: "success" });
});
// -------------------------------------------

app.post(
  "/api/send-single",
  checkAccess,
  upload.array("attachments"),
  async (req, res, next) => {
    let remoteAttachments = [];
    let autoCleanupRemoteAttachments = false;

    try {
      const emailService = (req.body.emailService || "").trim();
      const emailUser = (req.body.emailUser || "").trim();
      const emailPass = (req.body.emailPass || "").trim();
      const senderName = (req.body.senderName || "").trim();
      const emailSubject = (req.body.emailSubject || "").trim();
      const emailTemplate = (req.body.emailTemplate || "").trim();
      const recipientName = (req.body.recipientName || "").trim();
      const recipientEmail = (req.body.recipientEmail || "").trim();
      remoteAttachments = parseJsonArrayField(req.body.remoteAttachments);
      autoCleanupRemoteAttachments = parseBoolean(
        req.body.autoCleanupRemoteAttachments,
        false
      );

      if (!emailService || !emailUser || !emailPass || !recipientEmail) {
        return res.status(400).send({
          message: "Email credentials and recipient email are required.",
        });
      }

      const transporter = nodemailer.createTransport({
        service: emailService,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const formattedFrom = senderName
        ? `"${senderName}" <${emailUser}>`
        : emailUser;

      const bodies = buildEmailBodies(emailTemplate, recipientName, recipientEmail);

      let attachments = (req.files || []).map((file) => {
        // Fix encoding for the originalname
        const fixedName = fixFilenameEncoding(file.originalname);
        return {
          filename: fixedName,
          content: fs.readFileSync(file.path),
          contentType: file.mimetype,
        };
      });

      // Pre-download remote attachments instead of letting nodemailer fetch URLs
      // (avoids cryptic "Invalid status code 401" when Cloudinary URLs expire)
      const remoteMailAttachments = [];
      for (const attachment of remoteAttachments.filter(
        (a) => a?.url || a?.publicId || a?.public_id
      )) {
        remoteMailAttachments.push(await downloadRemoteAttachment(attachment));
      }

      attachments = [...attachments, ...remoteMailAttachments];

      // Check for shared batch files
      const sharedBatchId = req.body.sharedBatchId;
      if (sharedBatchId && sharedFileStore.has(sharedBatchId)) {
        const sharedFiles = sharedFileStore.get(sharedBatchId);
        attachments = [...attachments, ...sharedFiles];
      }

      await transporter.sendMail({
        from: formattedFrom,
        to: recipientEmail,
        subject: emailSubject || "Update from Certificate Studio",
        text: bodies.text,
        html: bodies.html,
        attachments,
      });

      console.log(`[CMS] Single email sent to: ${recipientEmail} with ${attachments.length} attachments.`);
      cleanupReqFiles(req);
      return res.status(200).send({ status: "success", message: `Sent to ${recipientEmail}` });
    } catch (error) {
      console.error(`Failed to send single email to ${req.body.recipientEmail}:`, error.message);

      let reason = getBounceReason(error);
      if (error?.code === "EAUTH" || error?.responseCode === 535) {
        reason = "Invalid credentials. Verify your email and app password.";
      }
      return res.status(400).send({ status: "failed", message: reason });
    } finally {
      cleanupReqFiles(req);
      if (autoCleanupRemoteAttachments && remoteAttachments.length) {
        destroyRemoteAttachments(remoteAttachments).catch((cleanupError) => {
          console.error("Remote attachment cleanup failed:", cleanupError.message);
        });
      }
    }
  }
);

const getTranIdFromRequest = (req) =>
  req.body?.tran_id ||
  req.query?.tran_id ||
  req.body?.tranId ||
  req.query?.tranId;

const completePurchaseAfterPayment = async (tranId) => {
  const pending = pendingPurchaseJobs.get(tranId);
  if (!pending) {
    return {
      error: {
        status: 404,
        message: "No pending purchase found for this transaction.",
      },
    };
  }

  const { email, name, days } = pending;
  const client = await pool.connect();
  const displayName = (name || email || "").split("@")[0] || "Member";
  const durationDays = parseInt(days, 10) || ACCESS_PERIOD_DAYS;
  let newExpiresAt = new Date();

  let isNewUser = false;
  let tempPassword = null;

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT u.id, ua.access_expires_at 
        FROM users u 
        LEFT JOIN user_access ua ON u.id = ua.user_id
        WHERE u.email = $1
      `,
      [email]
    );

    let userId = userResult.rows[0]?.id;

    if (userId && userResult.rows[0]?.access_expires_at) {
      const currentExpiry = new Date(userResult.rows[0].access_expires_at);
      if (currentExpiry > new Date()) {
        // If renewing early, add days to the current expiration date
        newExpiresAt = currentExpiry;
      }
    }
    
    // Add the purchased days
    newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);

    if (!userId) {
      // --- NEW USER: generate temp password ---
      isNewUser = true;
      tempPassword = generateRandomPassword();
      const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);
      const newUserQuery = `
        INSERT INTO users(email, password_hash, display_name)
        VALUES($1, $2, $3)
        RETURNING id;
      `;
      const newUserResult = await client.query(newUserQuery, [
        email,
        passwordHash,
        displayName,
      ]);
      userId = newUserResult.rows[0].id;
    }
    // --- EXISTING USER (RENEWAL): do NOT change their password ---

    const updateAccessQuery = `
      INSERT INTO user_access (user_id, access_expires_at, last_renewal_date, is_active)
      VALUES ($1, $2, NOW(), TRUE)
      ON CONFLICT (user_id) DO UPDATE SET 
          access_expires_at = $2, 
          last_renewal_date = NOW(),
          is_active = TRUE;
    `;
    await client.query(updateAccessQuery, [userId, newExpiresAt]);

    await client.query("COMMIT");

    const transporter = nodemailer.createTransport({
      service: PURCHASE_EMAIL_SERVICE,
      auth: {
        user: PURCHASE_EMAIL_USER,
        pass: PURCHASE_EMAIL_PASS,
      },
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;

    let emailSubject, emailBody;

    if (isNewUser) {
      // First-time purchase — send credentials
      emailSubject = "Your Certificate Studio Access Credentials";
      emailBody = `
        <h1>Certificate Studio Access Confirmation</h1>
        <p>Thank you for your purchase! Your access has been granted for ${durationDays} days.</p>
        <h2>Your Credentials:</h2>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary Password:</strong> <code>${tempPassword}</code></li>
          <li><strong>Access Expires:</strong> ${newExpiresAt.toDateString()}</li>
        </ul>
        <p>Login at: <a href="${baseUrl}/user/login">Login Page</a></p>
      `;
    } else {
      // Renewal — don't reveal password, just confirm plan update
      emailSubject = "Your Certificate Studio Plan Has Been Updated!";
      emailBody = `
        <h1>Plan Updated Successfully! 🎉</h1>
        <p>Great news! Your Certificate Studio plan has been renewed for another <strong>${durationDays} days</strong>.</p>
        <h2>Updated Details:</h2>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>New Expiry Date:</strong> ${newExpiresAt.toDateString()}</li>
        </ul>
        <p>Your existing password remains unchanged. No action needed.</p>
        <p>Login at: <a href="${baseUrl}/user/login">Login Page</a></p>
      `;
    }

    await transporter.sendMail({
      from: PURCHASE_EMAIL_USER,
      to: email,
      subject: emailSubject,
      html: emailBody,
    });

    pendingPurchaseJobs.delete(tranId);

    return {
      payload: {
        status: isNewUser ? "new_access" : "renewed",
        message: isNewUser
          ? `Access granted and temporary password sent to ${email}.`
          : `Your plan has been renewed! Details sent to ${email}.`,
        email,
        expiresAt: newExpiresAt.toISOString(),
      },
      httpStatus: 200,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    pendingPurchaseJobs.delete(tranId);
    console.error("❌ Failed to finalize purchase:", err);
    return {
      error: {
        status: 500,
        message: "Failed to finalize purchase after payment.",
      },
    };
  } finally {
    client.release();
  }
};

const completePaymentAndSend = async (tranId) => {
  if (!tranId) {
    return {
      error: { status: 400, message: "Missing transaction id (tran_id)." },
    };
  }

  const pending = pendingEmailJobs.get(tranId);
  if (pending) {
    try {
      const result = await sendEmailBatch(pending.emailJob);
      pendingEmailJobs.delete(tranId);
      return result;
    } catch (err) {
      pendingEmailJobs.delete(tranId);
      return {
        error: {
          status: 500,
          message: "Failed to send emails after payment.",
        },
      };
    }
  }

  const purchaseResult = await completePurchaseAfterPayment(tranId);
  return purchaseResult;
};

app.post("/api/payments/success", async (req, res) => {
  const tranId = getTranIdFromRequest(req);
  const paymentStatus = (req.body?.status || req.query?.status || "")
    .toString()
    .toUpperCase();
  if (
    paymentStatus &&
    !["VALID", "VALIDATED", "SUCCESS"].includes(paymentStatus)
  ) {
    return res
      .status(400)
      .send({ status: "failed", message: "Payment not validated." });
  }
  const result = await completePaymentAndSend(tranId);

  const redirectBase = getClientBaseUrl(req);
  const successUrl = `${redirectBase}/user/login?payment=success`;
  const failUrl = `${redirectBase}/pricing?payment=failed`;

  if (result.error) {
    return redirectWithMessage(
      res,
      failUrl,
      result.error.message || "Payment failed."
    );
  }

  return redirectWithMessage(
    res,
    successUrl,
    "Payment successful. Redirecting to login..."
  );
});

app.post("/api/payments/ipn", async (req, res) => {
  const tranId = getTranIdFromRequest(req);
  const paymentStatus = (req.body?.status || "").toString().toUpperCase();
  if (
    paymentStatus &&
    !["VALID", "VALIDATED", "SUCCESS"].includes(paymentStatus)
  ) {
    return res
      .status(400)
      .send({ status: "failed", message: "Payment not validated." });
  }
  const result = await completePaymentAndSend(tranId);

  if (result.error) {
    return res
      .status(result.error.status || 400)
      .send({ status: "failed", message: result.error.message });
  }

  return res
    .status(result.httpStatus || 200)
    .send({ tranId, ...result.payload });
});

app.post("/api/payments/fail", (req, res) => {
  const tranId = getTranIdFromRequest(req);
  if (tranId) {
    if (pendingEmailJobs.has(tranId)) pendingEmailJobs.delete(tranId);
    if (pendingPurchaseJobs.has(tranId)) pendingPurchaseJobs.delete(tranId);
  }
  const redirectBase = getClientBaseUrl(req);
  const failUrl = `${redirectBase}/pricing?payment=failed`;
  return redirectWithMessage(res, failUrl, "Payment failed or was declined.");
});

app.post("/api/payments/cancel", (req, res) => {
  const tranId = getTranIdFromRequest(req);
  if (tranId) {
    if (pendingEmailJobs.has(tranId)) pendingEmailJobs.delete(tranId);
    if (pendingPurchaseJobs.has(tranId)) pendingPurchaseJobs.delete(tranId);
  }
  const redirectBase = getClientBaseUrl(req);
  const cancelUrl = `${redirectBase}/pricing?payment=failed`;
  return redirectWithMessage(res, cancelUrl, "Payment cancelled by user.");
});

app.post(
  "/api/generate-preview",
  checkAccess, // Protected Route
  rejectIfTooLarge,
  upload.fields([{ name: "templateImage", maxCount: 1 }]),
  async (req, res, next) => {
    console.log("Received preview request for:", req.body.previewName);

    try {
      if (!req.files?.templateImage?.[0]) {
        return res.status(400).send({ message: "Template image is required." });
      }
      if (!req.body.previewName) {
        return res.status(400).send({ message: "A preview name is required." });
      }

      const layout = JSON.parse(req.body.layout || "{}");
      const templateBuffer = req.files.templateImage[0].buffer;
      const fullName = toTitleCase(req.body.previewName || "");

      const pngBuffer = await drawTextOnCanvas(
        templateBuffer,
        layout,
        fullName
      );

      const safeName = sanitizeFileName(fullName) || "certificate";

      res.set("Content-Type", "image/png");
      res.set("Content-Disposition", `attachment; filename=${safeName}.png`);
      res.send(pngBuffer);
      console.log(`✅ Preview PNG sent for ${safeName}.`);
      cleanupReqFiles(req);
    } catch (error) {
      cleanupReqFiles(req);
      return next(error);
    }
  }
);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.message === "Unexpected end of form") {
    console.error("Upload interrupted (busboy)", {
      contentLength: req.headers["content-length"] || null,
      files: Object.keys(req.files || {}),
      fields: Object.keys(req.body || {}),
      err: err?.message,
    });
    return res.status(400).send({
      message:
        "File upload was interrupted (likely because the total upload exceeded ~9MB). Please reduce attachment/template size and re-select the files.",
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).send({
        message: `Unexpected field received. Please check your form data. Field: ${err.field}`,
      });
    }
    const friendlyMessage =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Please keep each upload under 25MB."
        : err.message;
    return res.status(400).send({ message: friendlyMessage });
  }

  console.error("Unhandled error:", err);
  res
    .status(500)
    .send({ message: "Internal server error", error: err.message });
});

let serverInstance = null;

const handleServerError = (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or set PORT to a free value.`
    );
    process.exit(1);
  }

  throw err;
};

// Setup fonts immediately on load
setupFonts();

if (require.main === module) {
  serverInstance = app.listen(port, () => {
    console.log(`🚀 Certificate server running on http://localhost:${port}`);
    console.log(`Serving fonts from: http://localhost:${port}/fonts`);

    pool
      .query("SELECT NOW()")
      .then(() => console.log("✅ PostgreSQL database connected successfully."))
      .catch((err) =>
        console.error(
          "❌ PostgreSQL database connection failed. Did you create the DB/table and check .env?",
          err.message
        )
      );
  });
  serverInstance.on("error", handleServerError);
}

module.exports = app;
