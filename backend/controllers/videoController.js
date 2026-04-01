const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Nema videa",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "svet-igraonica/videos",
          resource_type: "video",
          transformation: [
            { width: 1280, height: 720, crop: "limit" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
          ],
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        },
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

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
    next(error);
  }
};
