const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const axios = require("axios");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const { drawTextOnCanvas, drawTextOnPDF } = require("../services/canvasService");
const { chunkArray, getColumnValue, sanitizeFileName, stripExtension, parseBoolean, toTitleCase, buildEmailBodies } = require("../utils/helpers");
const { createTransporter } = require("../services/mailer");

const activeJobs = new Map();
const sharedFileStore = new Map();
const pendingEmailJobs = new Map();
const pendingPurchaseJobs = new Map();

const cloudinary = require("cloudinary").v2;
const { fontList } = require("../services/fontService");

// Cloudinary Config (should ideally be in a separate config or service)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
        filename: attachment.filename || "attachment",
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
      "Attachment file has expired or is no longer accessible. Please re-upload and try again."
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

const getProgress = (req, res) => {
  const jobId = req.params.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendUpdate = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const job = activeJobs.get(jobId);
  if (!job) {
    sendUpdate({ status: "not_found" });
    return res.end();
  }

  const interval = setInterval(() => {
    const currentJob = activeJobs.get(jobId);
    if (!currentJob) {
      clearInterval(interval);
      return res.end();
    }
    sendUpdate({
      status: currentJob.status,
      processed: currentJob.processed,
      total: currentJob.total,
      successCount: currentJob.successCount,
      failureCount: currentJob.failureCount,
      payload: currentJob.payload
    });
    if (currentJob.status === "completed" || currentJob.status === "failed") {
      clearInterval(interval);
      res.end();
      setTimeout(() => activeJobs.delete(jobId), 300000);
    }
  }, 1000);

  req.on("close", () => clearInterval(interval));
};

const getFonts = (req, res) => {
  res.json(fontList);
};

const getFontFile = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), "fonts", filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Font not found");
  }
};

const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).send({ message: "No image file uploaded." });
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "certificate-studio-signatures",
    });
    fs.unlinkSync(req.file.path);
    res.json({ message: "Image uploaded successfully", url: result.secure_url, filename: req.file.filename });
  } catch (err) {
    res.status(500).send({ message: "Failed to upload image." });
  }
};

const generatePreview = async (req, res) => {
  try {
    if (!req.files?.templateImage?.[0] || !req.body.previewName) {
      return res.status(400).send({ message: "Template image and preview name required." });
    }
    const layout = JSON.parse(req.body.layout || "{}");
    const templateBuffer = fs.readFileSync(req.files.templateImage[0].path);
    const pngBuffer = await drawTextOnCanvas(templateBuffer, layout, req.body.previewName);
    res.set("Content-Type", "image/png");
    res.send(pngBuffer);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const signAttachmentUpload = async (req, res) => {
  try {
    const signature = buildAttachmentUploadSignature({
      filename: sanitizeFileName(req.body?.filename || "attachment.pdf"),
      purpose: req.body?.purpose,
    });
    res.status(200).send(signature);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const cleanupRemoteAttachmentUploads = async (req, res) => {
  try {
    const attachments = Array.isArray(req.body?.attachments)
      ? req.body.attachments
      : [];
    await destroyRemoteAttachments(attachments);
    res.status(200).send({ status: "success" });
  } catch (error) {
    res.status(500).send({ message: "Failed to clean up attachments." });
  }
};

const cleanupExpiredAttachmentUploads = async (req, res) => {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    const result = await cleanupExpiredRemoteAttachments();
    res.status(200).send({
      status: "success",
      ...result,
      maxAge: DEFAULT_ATTACHMENT_CLEANUP_MAX_AGE,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to clean up expired attachments." });
  }
};

const uploadShared = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).send({ message: "No files provided." });
    const sharedBatchId = uuidv4();
    const files = req.files.map(file => ({
      filename: file.originalname,
      content: fs.readFileSync(file.path),
      contentType: file.mimetype,
    }));
    sharedFileStore.set(sharedBatchId, files);
    res.status(200).send({ sharedBatchId });
  } catch (error) {
    res.status(500).send({ message: "Failed to upload shared files." });
  }
};

const cleanupShared = (req, res) => {
  const { sharedBatchId } = req.body;
  if (sharedBatchId) sharedFileStore.delete(sharedBatchId);
  res.status(200).send({ status: "success" });
};

const sendSingle = async (req, res) => {
  let remoteAttachments = [];
  let autoCleanupRemoteAttachments = false;

  try {
    const {
      emailService,
      emailUser,
      emailPass,
      recipientEmail,
      emailSubject,
      emailTemplate,
      recipientName,
      senderName,
    } = req.body;
    remoteAttachments = parseJsonArrayField(req.body.remoteAttachments);
    autoCleanupRemoteAttachments = parseBoolean(
      req.body.autoCleanupRemoteAttachments,
      false
    );
    const transporter = createTransporter({ service: emailService, user: emailUser, pass: emailPass });
    const bodies = buildEmailBodies(emailTemplate, recipientName, recipientEmail);

    const localAttachments = (req.files || []).map(f => ({
      filename: f.originalname,
      content: fs.readFileSync(f.path),
      contentType: f.mimetype
    }));
    const remoteMailAttachments = [];
    for (const attachment of remoteAttachments.filter(
      (a) => a?.url || a?.publicId || a?.public_id
    )) {
      remoteMailAttachments.push(await downloadRemoteAttachment(attachment));
    }

    await transporter.sendMail({
      from: senderName ? `"${senderName}" <${emailUser}>` : emailUser,
      to: recipientEmail,
      subject: emailSubject || "Update from Certificate Studio",
      text: bodies.text,
      html: bodies.html,
      attachments: [...localAttachments, ...remoteMailAttachments]
    });

    res.status(200).send({ status: "success", message: `Sent to ${recipientEmail}` });
  } catch (error) {
    res.status(400).send({ status: "failed", message: error.message });
  } finally {
    if (req.files) {
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch(e) {}
      });
    }
    if (autoCleanupRemoteAttachments && remoteAttachments.length) {
      destroyRemoteAttachments(remoteAttachments).catch(() => {});
    }
  }
};

const sendEmailBatch = async (job = {}) => {
  const {
    recipients = [],
    attachmentMode,
    personalizeWithNames,
    layout,
    templateBuffer,
    templateFilename,
    templateBaseName,
    sharedAttachmentFiles = [],
    emailConfig = {},
    missingEmailRecipients = [],
    totalRows = 0,
    jobId = null,
  } = job;

  const {
    emailService,
    emailUser,
    emailPass,
    senderName,
    emailSubject,
    emailTemplate,
  } = emailConfig;

  if (!recipients.length || !emailService || !emailUser || !emailPass) {
    return { error: { status: 400, message: "Missing recipients or email configuration." } };
  }

  const transporter = createTransporter({ service: emailService, user: emailUser, pass: emailPass });
  const formattedFrom = senderName ? `"${senderName}" <${emailUser}>` : emailUser;
  
  let successCount = 0;
  const failures = [];

  for (const recipient of recipients) {
    try {
      const bodies = buildEmailBodies(emailTemplate, recipient.name, recipient.email);
      let attachments = [];

      if (attachmentMode === "shared") {
        attachments = sharedAttachmentFiles.map(f => ({ filename: f.originalname, content: f.content, contentType: f.mimetype }));
      } else {
        const pdfBuffer = await drawTextOnPDF(templateBuffer, layout, recipient.name, { drawName: personalizeWithNames });
        attachments = [{ filename: `${sanitizeFileName(recipient.name)}.pdf`, content: pdfBuffer, contentType: "application/pdf" }];
      }

      await transporter.sendMail({
        from: formattedFrom,
        to: recipient.email,
        subject: emailSubject || "Your Certificate",
        text: bodies.text,
        html: bodies.html,
        attachments,
      });

      successCount++;
    } catch (error) {
      failures.push({ name: recipient.name, email: recipient.email, reason: error.message });
    }

    if (jobId && activeJobs.has(jobId)) {
      const jobState = activeJobs.get(jobId);
      jobState.successCount = successCount;
      jobState.failureCount = failures.length;
      jobState.processed = successCount + failures.length;
    }
  }

  return { payload: { successCount, failureCount: failures.length, failures }, httpStatus: failures.length ? 207 : 200 };
};

const generate = async (req, res, next) => {
  try {
    if (!req.files?.templateImage?.[0] || !req.files?.dataFile?.[0]) {
      return res.status(400).send({ message: "Template image and data file are required." });
    }
    const personalizeWithNames = parseBoolean(req.body.personalizeWithNames, true);
    let layout = JSON.parse(req.body.layout || "{}");
    
    const templateBuffer = fs.readFileSync(req.files.templateImage[0].path);
    const workbook = XLSX.readFile(req.files.dataFile[0].path);
    const firstSheetName = workbook.SheetNames?.[0] || "";
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

    const zip = new JSZip();
    const generationPromises = rows.map(async (row) => {
      const fullName = toTitleCase(row.Name || "");
      if (!fullName) return null;
      const pdfBuffer = await drawTextOnPDF(templateBuffer, layout, fullName, { drawName: personalizeWithNames });
      return { safeName: sanitizeFileName(fullName), pdfBuffer };
    });

    const results = await Promise.all(generationPromises);
    results.forEach(res => res && zip.file(`${res.safeName}.pdf`, res.pdfBuffer));

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename=certificates.zip`);
    res.send(zipBuffer);
  } catch (error) {
    next(error);
  }
};

const generateAndSend = async (req, res, next) => {
  const jobId = uuidv4();
  activeJobs.set(jobId, { status: 'running', processed: 0, total: 0, successCount: 0, failureCount: 0 });
  
  try {
    const attachmentMode = req.body.attachmentMode || "certificate";
    const personalizeWithNames = parseBoolean(req.body.personalizeWithNames, true);
    const emailConfig = {
      emailService: (req.body.emailService || "").trim(),
      emailUser: (req.body.emailUser || "").trim(),
      emailPass: (req.body.emailPass || "").trim(),
      senderName: (req.body.senderName || "").trim(),
      emailSubject: (req.body.emailSubject || "").trim(),
      emailTemplate: (req.body.emailTemplate || "").trim(),
    };

    if (!emailConfig.emailService || !emailConfig.emailUser || !emailConfig.emailPass) {
      return res.status(400).send({ message: "Email configuration is required." });
    }

    let templateBuffer = null;
    let templateFilename = "certificate.png";
    let templateBaseName = "certificate";

    // 1. Resolve Template (File or URL)
    if (attachmentMode === "certificate") {
      if (req.files?.templateImage?.[0]) {
        templateBuffer = fs.readFileSync(req.files.templateImage[0].path);
        templateFilename = req.files.templateImage[0].originalname;
        templateBaseName = stripExtension(templateFilename);
      } else if (req.body.templateImageUrl) {
        // Support for Canva / Remote URLs
        const response = await axios.get(req.body.templateImageUrl, { responseType: 'arraybuffer' });
        templateBuffer = Buffer.from(response.data, 'binary');
        templateFilename = "canva-design.png";
        templateBaseName = "canva-design";
      } else {
        return res.status(400).send({ message: "Template image or URL is required for certificate mode." });
      }
    }

    // 2. Resolve Recipients (Excel file or manual)
    let recipients = [];
    if (req.files?.dataFile?.[0]) {
      const workbook = XLSX.readFile(req.files.dataFile[0].path);
      const firstSheetName = workbook.SheetNames?.[0] || "";
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
      recipients = rows.map(r => ({
        name: toTitleCase(getColumnValue(r, "Name") || ""),
        email: (getColumnValue(r, "Email") || "").toString().trim()
      })).filter(r => r.name && r.email);
    }

    if (req.body.manualRecipients) {
      try {
        const manual = JSON.parse(req.body.manualRecipients);
        if (Array.isArray(manual)) {
          recipients = [...recipients, ...manual.map(r => ({
            name: toTitleCase(r.name || ""),
            email: (r.email || "").toString().trim()
          })).filter(r => r.name && r.email)];
        }
      } catch (e) {}
    }

    if (!recipients.length) {
      return res.status(400).send({ message: "No valid recipients found." });
    }

    const layout = JSON.parse(req.body.layout || "{}");
    const sharedAttachmentFiles = (req.files?.sharedAttachment || []).map(f => ({
      originalname: f.originalname,
      content: fs.readFileSync(f.path),
      mimetype: f.mimetype
    }));

    const job = {
      recipients,
      attachmentMode,
      personalizeWithNames,
      layout,
      templateBuffer,
      templateFilename,
      templateBaseName,
      sharedAttachmentFiles,
      emailConfig,
      jobId
    };

    activeJobs.get(jobId).total = recipients.length;
    res.status(202).send({ status: "processing", jobId });

    // Start background batch
    sendEmailBatch(job).then(result => {
      const state = activeJobs.get(jobId);
      if (state) {
        state.status = result.error ? 'failed' : 'completed';
        state.payload = result.payload;
      }
    });

  } catch (error) {
    activeJobs.get(jobId).status = 'failed';
    next(error);
  }
};

module.exports = {
  getProgress,
  getFonts,
  getFontFile,
  uploadImage,
  generatePreview,
  signAttachmentUpload,
  cleanupRemoteAttachmentUploads,
  cleanupExpiredAttachmentUploads,
  uploadShared,
  cleanupShared,
  sendSingle,
  generate,
  generateAndSend,
  activeJobs,
  sharedFileStore,
  pendingEmailJobs,
  pendingPurchaseJobs,
  sendEmailBatch
};
