const multer = require("multer");
const os = require("os");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXCEL_MIMES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const BLOCKED_ATTACHMENT_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".js", ".vbs", ".scr", ".msi", ".com", ".pif"
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === "templateImage") {
    const isImageMime = ALLOWED_IMAGE_MIMES.includes(file.mimetype);
    const isImageExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
    
    if (isImageMime && isImageExt) {
      cb(null, true);
    } else {
      cb(new Error("Invalid image upload! Only PNG, JPEG, and WebP are allowed."));
    }
  } else if (file.fieldname === "dataFile") {
    const isExcelMime = ALLOWED_EXCEL_MIMES.includes(file.mimetype);
    const isExcelExt = [".xls", ".xlsx"].includes(ext);
    
    if (isExcelMime && isExcelExt) {
      cb(null, true);
    } else {
      cb(new Error("Invalid data file upload! Only Excel spreadsheets (.xls, .xlsx) are allowed."));
    }
  } else if (
    file.fieldname === "sharedAttachment" ||
    file.fieldname === "attachments" ||
    file.fieldname === "file"
  ) {
    if (BLOCKED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      cb(new Error("Security warning: Executable/script file uploads are blocked!"));
    } else {
      cb(null, true);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 20,
    fields: 100,
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImageMime = file.mimetype.startsWith("image/");
    const isImageExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext);

    if (isImageMime && isImageExt) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (PNG, JPEG, WebP) are allowed!"));
    }
  },
});

module.exports = { upload, uploadImage };
