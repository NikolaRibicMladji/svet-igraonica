const cloudinary = require("../config/cloudinary");
const Playroom = require("../models/Playroom");
const streamifier = require("streamifier");

// Upload slike za igraonicu
exports.uploadPlayroomImage = async (req, res) => {
  try {
    const { playroomId } = req.params;

    // Proveri da li igraonica postoji
    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Proveri prava (samo vlasnik ili admin)
    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da dodajete slike za ovu igraonicu",
      });
    }

    // Proveri da li je slika poslata
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Molimo odaberite sliku",
      });
    }

    // Upload na Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "svet-igraonica",
          transformation: [
            { width: 800, height: 600, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // Sačuvaj URL slike u bazi
    playroom.slike.push({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
      isMain: playroom.slike.length === 0, // Prva slika je glavna
    });
    await playroom.save();

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
      message: "Slika je uspešno dodata",
    });
  } catch (error) {
    console.error("Greška pri uploadu slike:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri uploadu slike",
      error: error.message,
    });
  }
};

// Obriši sliku
exports.deletePlayroomImage = async (req, res) => {
  try {
    const { playroomId, imageUrl } = req.params;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Proveri prava
    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da brišete slike za ovu igraonicu",
      });
    }

    // Izbaci URL iz niza
    const decodedUrl = decodeURIComponent(imageUrl);
    playroom.slike = playroom.slike.filter((image) => image.url !== decodedUrl);
    await playroom.save();

    res.status(200).json({
      success: true,
      message: "Slika je obrisana",
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};
