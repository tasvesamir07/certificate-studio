const express = require("express");
const router = express.Router();
const certController = require("../controllers/certController");
const { upload, uploadImage } = require("../middleware/upload");
const { requireAuth } = require("../middleware/auth");

router.get("/progress/:id", requireAuth, certController.getProgress);
router.get("/fonts", requireAuth, certController.getFonts);
router.get("/fonts/:filename", requireAuth, certController.getFontFile);
router.post("/upload-image", requireAuth, uploadImage.single("image"), certController.uploadImage);
router.post("/generate", requireAuth, upload.fields([{ name: "templateImage", maxCount: 1 }, { name: "dataFile", maxCount: 1 }]), certController.generate);
router.post("/generate-and-send", requireAuth, upload.fields([
  { name: "templateImage", maxCount: 1 },
  { name: "dataFile", maxCount: 1 },
  { name: "sharedAttachment", maxCount: 10 },
]), certController.generateAndSend);
router.post("/generate-preview", requireAuth, upload.fields([{ name: "templateImage", maxCount: 1 }]), certController.generatePreview);
router.post("/attachments/sign-upload", requireAuth, upload.single("file"), certController.signAttachmentUpload);
router.post("/attachments/cleanup", requireAuth, certController.cleanupRemoteAttachmentUploads);
router.get("/attachments/cleanup-expired", requireAuth, certController.cleanupExpiredAttachmentUploads);
router.post("/upload-shared", requireAuth, upload.array("attachments"), certController.uploadShared);
router.post("/cleanup-shared", requireAuth, certController.cleanupShared);
router.post("/send-single", requireAuth, upload.array("attachments"), certController.sendSingle);
router.get("/files/:fileId", certController.serveFile);

module.exports = router;
