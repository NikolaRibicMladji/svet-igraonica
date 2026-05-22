const cloudinary = require("../config/cloudinary");
const Playroom = require("../models/Playroom");
const ErrorResponse = require("../utils/errorResponse");
const {
  uploadFileToCloudinary,
  safeRemoveFile,
} = require("../utils/cloudinaryUpload");

// Upload videa za igraonicu
exports.uploadPlayroomVideo = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da dodajete video za ovu igraonicu",
        403,
      );
    }

    if (!req.file) {
      throw new ErrorResponse("Molimo odaberite video", 400);
    }

    if (!Array.isArray(playroom.videoGalerija)) {
      playroom.videoGalerija = [];
    }

    if (playroom.videoGalerija.length >= 3) {
      throw new ErrorResponse("Maksimalan broj videa za igraonicu je 3", 400);
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

    playroom.videoGalerija.push({
      url: result.secure_url,
      publicId: result.public_id,
      thumbnail: cloudinary.url(result.public_id, {
        resource_type: "video",
        format: "jpg",
        secure: true,
      }),
      duration: result.duration,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    });

    try {
      await playroom.save();
    } catch (error) {
      if (result.public_id) {
        await cloudinary.uploader.destroy(result.public_id, {
          resource_type: "video",
        });
      }

      throw error;
    }

    return res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        thumbnail: cloudinary.url(result.public_id, {
          resource_type: "video",
          format: "jpg",
          secure: true,
        }),
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      },
      message: "Video je uspešno dodat",
    });
  } catch (error) {
    if (req.file?.path) {
      await safeRemoveFile(req.file.path);
    }

    next(error);
  }
};

// Obriši video
exports.deletePlayroomVideo = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;
    const { publicId } = req.validated.body;

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da brišete video za ovu igraonicu",
        403,
      );
    }

    if (!Array.isArray(playroom.videoGalerija)) {
      throw new ErrorResponse("Igraonica nema video zapise", 404);
    }

    const videoToDelete = playroom.videoGalerija.find(
      (video) => video.publicId === publicId,
    );

    if (!videoToDelete) {
      throw new ErrorResponse("Video nije pronađen", 404);
    }

    await cloudinary.uploader.destroy(videoToDelete.publicId, {
      resource_type: "video",
    });

    playroom.videoGalerija = playroom.videoGalerija.filter(
      (video) => video.publicId !== publicId,
    );

    await playroom.save();

    return res.status(200).json({
      success: true,
      message: "Video je obrisan",
    });
  } catch (error) {
    next(error);
  }
};
