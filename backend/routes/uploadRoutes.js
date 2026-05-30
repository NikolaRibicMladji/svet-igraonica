const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const {
  uploadPlayroomImageSchema,
  deletePlayroomImageSchema,
  setPlayroomProfileImageSchema,
  uploadPlayroomVideoSchema,
  deletePlayroomVideoSchema,
} = require("../validations/uploadValidation");
const upload = require("../middleware/upload");

const {
  uploadPlayroomImage,
  deletePlayroomImage,
  setPlayroomProfileImage,
} = require("../controllers/uploadController");

const {
  uploadPlayroomVideo,
  deletePlayroomVideo,
} = require("../controllers/videoController");

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

// ⭐ postavi profilnu sliku
router.put(
  "/playroom/:playroomId/profile-image",
  validate(setPlayroomProfileImageSchema),
  setPlayroomProfileImage,
);

// 🗑 brisanje slike
router.delete(
  "/playroom/:playroomId/image",
  validate(deletePlayroomImageSchema),
  deletePlayroomImage,
);

// 🎥 upload video
router.post(
  "/playroom/:playroomId/video",
  validate(uploadPlayroomVideoSchema),
  upload.singleVideo("video"),
  uploadPlayroomVideo,
);

router.delete(
  "/playroom/:playroomId/video",
  validate(deletePlayroomVideoSchema),
  deletePlayroomVideo,
);

module.exports = router;
