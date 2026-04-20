const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/tmp");

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

      cb(null, `${Date.now()}-${safeBaseName}${ext}`);
    } catch (err) {
      cb(new Error("Greška pri kreiranju naziva fajla"));
    }
  },
});

const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_SIZE = 25 * 1024 * 1024; // 25MB za sigurniji production start

const allowedImageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
  ".ico",
]);

const allowedVideoExtensions = new Set([
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
]);

const imageFileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const isImageMime = mime.startsWith("image/");
    const isAllowedImage = isImageMime || allowedImageExtensions.has(ext);

    if (isAllowedImage) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Dozvoljeni su samo image fajlovi (jpg, jpeg, png, gif, webp, bmp, svg, avif, heic, heif, tif, tiff, ico).",
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
    const isAllowedVideo = isVideoMime || allowedVideoExtensions.has(ext);

    if (isAllowedVideo) {
      return cb(null, true);
    }

    return cb(
      new Error("Dozvoljeni su samo video fajlovi (mp4, mov, avi, mkv, webm)."),
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
