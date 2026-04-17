const Playroom = require("../models/Playroom");
const User = require("../models/User");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const {
  verifyPlayroomAndGenerateSlots,
} = require("../services/playroomService");

// @desc    Dohvati sve neverifikovane igraonice
// @route   GET /api/admin/playrooms/unverified
// @access  Private (admin)
exports.getUnverifiedPlayrooms = async (req, res, next) => {
  try {
    const playrooms = await Playroom.find({
      verifikovan: false,
      status: PLAYROOM_STATUS.U_IZRADI,
    })
      .populate("vlasnikId", "ime prezime email telefon")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: playrooms.length,
      data: playrooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati sve korisnike
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verifikuj igraonicu (admin)
// @route   PUT /api/admin/playrooms/:id/verify
// @access  Private (admin)
exports.verifyPlayroom = async (req, res, next) => {
  try {
    const result = await verifyPlayroomAndGenerateSlots(req.params.id);

    res.status(200).json({
      success: true,
      data: result.playroom,
      message: `Igraonica je verifikovana. ${
        result.slotResult?.createdCount || 0
      } termina je automatski kreirano.`,
    });
  } catch (error) {
    next(error);
  }
};
