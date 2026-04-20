const cloudinary = require("../config/cloudinary");
const Playroom = require("../models/Playroom");
const {
  uploadFileToCloudinary,
  safeRemoveFile,
} = require("../utils/cloudinaryUpload");

// Upload slike za igraonicu
exports.uploadPlayroomImage = async (req, res, next) => {
  try {
    const { playroomId } = req.params;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da dodajete slike za ovu igraonicu",
      });
    }

    if (!req.file) {
      throw new ErrorResponse("Molimo odaberite sliku", 400);
    }

    const result = await uploadFileToCloudinary({
      filePath: req.file.path,
      folder: "svet-igraonica",
      resourceType: "image",
      transformation: [
        { width: 1600, height: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    await safeRemoveFile(req.file.path);

    playroom.slike.push({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
    });

    if (!playroom.profilnaSlika?.url) {
      playroom.profilnaSlika = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    await playroom.save();

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
      message: "Slika je uspešno dodata",
    });
  } catch (error) {
    if (req.file?.path) {
      await safeRemoveFile(req.file.path);
    }
    next(error);
  }
};

// Obriši sliku
exports.deletePlayroomImage = async (req, res, next) => {
  try {
    const { playroomId, imageUrl } = req.params;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da brišete slike za ovu igraonicu",
      });
    }

    const decodedUrl = decodeURIComponent(imageUrl);
    const imageToDelete = playroom.slike.find(
      (image) => image.url === decodedUrl,
    );

    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: "Slika nije pronađena",
      });
    }

    if (imageToDelete.publicId) {
      await cloudinary.uploader.destroy(imageToDelete.publicId, {
        resource_type: "image",
      });
    }

    playroom.slike = playroom.slike.filter((image) => image.url !== decodedUrl);

    if (playroom.profilnaSlika?.url === decodedUrl) {
      if (playroom.slike.length > 0) {
        playroom.profilnaSlika = {
          url: playroom.slike[0].url,
          publicId: playroom.slike[0].publicId,
        };
      } else {
        playroom.profilnaSlika = {
          url: "",
          publicId: "",
        };
      }
    }

    await playroom.save();

    res.status(200).json({
      success: true,
      message: "Slika je obrisana",
    });
  } catch (error) {
    next(error);
  }
};
