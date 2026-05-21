const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "../.tmp/uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeBaseName = path
        .basename(file.originalname || "file", ext)
        .replace(/[^a-zA-Z0-9-_]/g, "_");

      const randomName = crypto.randomUUID();
      cb(
        null,
        `${Date.now()}-${randomName}-${safeBaseName.slice(0, 50)}${ext}`,
      );
    } catch (err) {
      cb(new Error("Greška pri kreiranju naziva fajla"));
    }
  },
});

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_SIZE = 20 * 1024 * 1024; // 20MB

const allowedImageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
]);

const allowedVideoExtensions = new Set([".mp4", ".mov", ".webm"]);
const imageFileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const isImageMime = mime.startsWith("image/");
    const isAllowedImage = isImageMime && allowedImageExtensions.has(ext);

    if (isAllowedImage) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Dozvoljeni su samo image fajlovi (jpg, jpeg, png, webp, avif).",
      ),
      false,
    );
  } catch (err) {
    return cb(new Error("Greška pri validaciji slike"), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const isVideoMime = mime.startsWith("video/");
    const isAllowedVideo = isVideoMime && allowedVideoExtensions.has(ext);

    if (isAllowedVideo) {
      return cb(null, true);
    }

    return cb(
      new Error("Dozvoljeni su samo video fajlovi (mp4, mov, webm)."),
      false,
    );
  } catch (err) {
    return cb(new Error("Greška pri validaciji videa"), false);
  }
};

const imageUpload = multer({
  storage,
  limits: {
    fileSize: IMAGE_MAX_SIZE,
  },
  fileFilter: imageFileFilter,
});

const videoUpload = multer({
  storage,
  limits: {
    fileSize: VIDEO_MAX_SIZE,
  },
  fileFilter: videoFileFilter,
});

const upload = {
  singleImage: (field = "image") => imageUpload.single(field),
  singleVideo: (field = "video") => videoUpload.single(field),
  multipleImages: (field = "images", max = 10) => imageUpload.array(field, max),

  limits: {
    imageMaxSize: IMAGE_MAX_SIZE,
    videoMaxSize: VIDEO_MAX_SIZE,
  },
};

module.exports = upload;
