const cloudinary = require("../config/cloudinary");
const {
  uploadFileToCloudinary,
  safeRemoveFile,
} = require("../utils/cloudinaryUpload");

exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Nema videa",
      });
    }

    const result = await uploadFileToCloudinary({
      filePath: req.file.path,
      folder: "svet-igraonica/videos",
      resourceType: "video",
      transformation: [
        { width: 1280, height: 720, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    await safeRemoveFile(req.file.path);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        thumbnail: cloudinary.url(result.public_id, {
          resource_type: "video",
          format: "jpg",
        }),
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
      message: "Video je uspešno uploadovan",
    });
  } catch (error) {
    if (req.file?.path) {
      await safeRemoveFile(req.file.path);
    }
    next(error);
  }
};
