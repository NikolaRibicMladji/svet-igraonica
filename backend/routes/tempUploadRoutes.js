const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  uploadFileToCloudinary,
  safeRemoveFile,
} = require("../utils/cloudinaryUpload");

// 🔒 upload privremenih slika (npr. pre kreiranja igraonice)
router.post(
  "/temp",
  protect,
  upload.singleImage("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nema slike",
        });
      }

      const result = await uploadFileToCloudinary({
        filePath: req.file.path,
        folder: "svet-igraonica/temp",
        resourceType: "image",
        transformation: [
          { width: 1200, height: 900, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      });

      await safeRemoveFile(req.file.path);

      res.status(200).json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
        },
        message: "Privremena slika uploadovana",
      });
    } catch (error) {
      if (req.file?.path) {
        await safeRemoveFile(req.file.path);
      }
      next(error);
    }
  },
);

module.exports = router;
