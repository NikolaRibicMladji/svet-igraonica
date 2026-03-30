const express = require("express");
const router = express.Router();
const { protect, vlasnik } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  uploadPlayroomImage,
  deletePlayroomImage,
} = require("../controllers/uploadController");
const videoController = require("../controllers/videoController");

// Zaštita svih ruta
router.use(protect);
router.use(vlasnik);

// Upload slike za igraonicu
router.post(
  "/playroom/:playroomId",
  upload.single("image"),
  uploadPlayroomImage,
);
router.delete("/playroom/:playroomId/:imageUrl", deletePlayroomImage);
router.post("/video", upload.single("video"), videoController.uploadVideo);

module.exports = router;
