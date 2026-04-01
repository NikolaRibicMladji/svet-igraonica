const multer = require("multer");
const path = require("path");

// Čuvanje u memoriji (za Cloudinary)
const storage = multer.memoryStorage();

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

const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const isImageMime = mime.startsWith("image/");
    const isVideoMime = mime.startsWith("video/");

    const isAllowedImage = isImageMime || allowedImageExtensions.has(ext);
    const isAllowedVideo = isVideoMime || allowedVideoExtensions.has(ext);

    if (isAllowedImage || isAllowedVideo) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Dozvoljeni su samo image i video fajlovi (jpg, png, webp, mp4, mov, avi...)",
      ),
      false,
    );
  } catch (err) {
    return cb(new Error("Greška pri validaciji fajla"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter,
});

// 👉 helperi (mnogo korisno za kontrolere)
upload.singleImage = (field = "image") => upload.single(field);
upload.singleVideo = (field = "video") => upload.single(field);
upload.multipleImages = (field = "images", max = 10) =>
  upload.array(field, max);

module.exports = upload;
