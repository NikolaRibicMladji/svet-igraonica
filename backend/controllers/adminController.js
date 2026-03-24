const Playroom = require("../models/Playroom");
const User = require("../models/User");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");

// @desc    Dohvati sve neverifikovane igraonice
// @route   GET /api/admin/playrooms/unverified
// @access  Private (admin)
exports.getUnverifiedPlayrooms = async (req, res) => {
  try {
    const playrooms = await Playroom.find({
      verifikovan: false,
      status: "u_izradi",
    }).populate("vlasnikId", "ime prezime email telefon");

    res.status(200).json({
      success: true,
      count: playrooms.length,
      data: playrooms,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati sve korisnike
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Verifikuj igraonicu (admin)
// @route   PUT /api/admin/playrooms/:id/verify
// @access  Private (admin)
exports.verifyPlayroom = async (req, res) => {
  try {
    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    playroom.verifikovan = true;
    playroom.status = "aktivan";
    await playroom.save();

    // AUTOMATSKI GENERIŠI TERMINE ZA NAREDNIH 30 DANA
    console.log(`Generišem termine za ${playroom.naziv}...`);
    const result = await generateTimeSlotsForPlayroom(playroom._id);

    res.status(200).json({
      success: true,
      data: playroom,
      message: `Igraonica je verifikovana. ${result.createdCount} termina je automatski kreirano.`,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};
