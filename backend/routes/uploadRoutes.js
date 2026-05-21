const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const {
  uploadPlayroomImageSchema,
  deletePlayroomImageSchema,
} = require("../validations/uploadValidation");
const upload = require("../middleware/upload");

const {
  uploadPlayroomImage,
  deletePlayroomImage,
} = require("../controllers/uploadController");

const { uploadVideo } = require("../controllers/videoController");

// 🔒 sve rute zahtevaju login + vlasnik/admin
router.use(protect);
router.use(authorize(ROLES.VLASNIK, ROLES.ADMIN));

// 📸 upload slike
router.post(
  "/playroom/:playroomId",
  validate(uploadPlayroomImageSchema),
  upload.singleImage("image"),
  uploadPlayroomImage,
);

// 🗑 brisanje slike
router.delete(
  "/playroom/:playroomId/image",
  validate(deletePlayroomImageSchema),
  deletePlayroomImage,
);

// 🎥 upload video
router.post("/video", upload.singleVideo("video"), uploadVideo);

module.exports = router;
