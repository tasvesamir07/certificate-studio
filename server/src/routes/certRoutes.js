const express = require("express");
const router = express.Router();
const certController = require("../controllers/certController");
const { upload, uploadImage } = require("../middleware/upload");

router.get("/progress/:id", certController.getProgress);
router.get("/fonts", certController.getFonts);
router.get("/fonts/:filename", certController.getFontFile);
router.post("/upload-image", uploadImage.single("image"), certController.uploadImage);
router.post("/generate", upload.fields([{ name: "templateImage", maxCount: 1 }, { name: "dataFile", maxCount: 1 }]), certController.generate);
router.post("/generate-and-send", upload.fields([
  { name: "templateImage", maxCount: 1 },
  { name: "dataFile", maxCount: 1 },
  { name: "sharedAttachment", maxCount: 10 },
]), certController.generateAndSend);
router.post("/generate-preview", upload.fields([{ name: "templateImage", maxCount: 1 }]), certController.generatePreview);
router.post("/attachments/sign-upload", certController.signAttachmentUpload);
router.post("/attachments/cleanup", certController.cleanupRemoteAttachmentUploads);
router.get("/attachments/cleanup-expired", certController.cleanupExpiredAttachmentUploads);
router.post("/upload-shared", upload.array("attachments"), certController.uploadShared);
router.post("/cleanup-shared", certController.cleanupShared);
router.post("/send-single", upload.array("attachments"), certController.sendSingle);

module.exports = router;
