const cloudinary = require("../config/cloudinary");
const Playroom = require("../models/Playroom");
const ErrorResponse = require("../utils/errorResponse");
const {
  uploadFileToCloudinary,
  safeRemoveFile,
} = require("../utils/cloudinaryUpload");

// Upload slike za igraonicu
exports.uploadPlayroomImage = async (req, res, next) => {
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
        "Nemate pravo da dodajete slike za ovu igraonicu",
        403,
      );
    }

    if (!req.file) {
      throw new ErrorResponse("Molimo odaberite sliku", 400);
    }

    if (!Array.isArray(playroom.slike)) {
      playroom.slike = [];
    }

    if (playroom.slike.length >= 10) {
      throw new ErrorResponse("Maksimalan broj slika za igraonicu je 10", 400);
    }

    const result = await uploadFileToCloudinary({
      filePath: req.file.path,
      folder: "svet-igraonica",
      resourceType: "image",
      transformation: [
        { width: 1200, height: 900, crop: "limit" },
        { quality: "auto:good" },
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

    try {
      await playroom.save();
    } catch (error) {
      if (result.public_id) {
        await cloudinary.uploader.destroy(result.public_id, {
          resource_type: "image",
        });
      }

      throw error;
    }

    return res.status(200).json({
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
    const { playroomId } = req.validated.params;
    const { publicId } = req.validated.body;

    if (!publicId) {
      throw new ErrorResponse("publicId slike je obavezan", 400);
    }

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da brišete slike za ovu igraonicu",
        403,
      );
    }

    if (!Array.isArray(playroom.slike)) {
      throw new ErrorResponse("Igraonica nema slike", 404);
    }

    const imageToDelete = playroom.slike.find(
      (image) => image.publicId === publicId,
    );

    if (!imageToDelete) {
      throw new ErrorResponse("Slika nije pronađena", 404);
    }

    await cloudinary.uploader.destroy(imageToDelete.publicId, {
      resource_type: "image",
    });

    playroom.slike = playroom.slike.filter(
      (image) => image.publicId !== publicId,
    );

    if (playroom.profilnaSlika?.publicId === publicId) {
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

    return res.status(200).json({
      success: true,
      message: "Slika je obrisana",
    });
  } catch (error) {
    next(error);
  }
};

// Postavi postojeću sliku iz galerije kao profilnu sliku
exports.setPlayroomProfileImage = async (req, res, next) => {
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
        "Nemate pravo da menjate profilnu sliku za ovu igraonicu",
        403,
      );
    }

    if (!Array.isArray(playroom.slike) || playroom.slike.length === 0) {
      throw new ErrorResponse("Igraonica nema slike.", 404);
    }

    const selectedImage = playroom.slike.find(
      (image) => image.publicId === publicId,
    );

    if (!selectedImage) {
      throw new ErrorResponse("Slika nije pronađena u galeriji.", 404);
    }

    playroom.profilnaSlika = {
      url: selectedImage.url,
      publicId: selectedImage.publicId,
    };

    await playroom.save();

    return res.status(200).json({
      success: true,
      message: "Profilna slika je ažurirana.",
      data: {
        profilnaSlika: playroom.profilnaSlika,
      },
    });
  } catch (error) {
    next(error);
  }
};
