const Playroom = require("../models/Playroom");
const mongoose = require("mongoose");
const User = require("../models/User");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const {
  verifyPlayroomAndGenerateSlots,
} = require("../services/playroomService");

const {
  sendPlayroomApprovedEmail,
  sendPlayroomRejectedEmail,
  sendPlayroomVerificationNotification,
} = require("../utils/emailService");

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
    const owner = await User.findById(result.playroom.vlasnikId);

    if (owner?.email) {
      await sendPlayroomApprovedEmail(result.playroom, owner);
    }

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

// @desc    Odbij igraonicu
// @route   PUT /api/admin/playrooms/:id/reject
// @access  Private (admin)
exports.rejectPlayroom = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Nevalidan ID igraonice.",
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Razlog odbijanja je obavezan.",
      });
    }

    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena.",
      });
    }

    playroom.status = PLAYROOM_STATUS.ODBIJEN;
    playroom.verifikovan = false;
    playroom.razlogOdbijanja = reason.trim();
    playroom.odbijenAt = new Date();

    await playroom.save();
    const owner = await User.findById(playroom.vlasnikId);

    if (owner?.email) {
      await sendPlayroomRejectedEmail(playroom, owner, reason.trim());
    }

    res.status(200).json({
      success: true,
      message: "Igraonica je odbijena.",
      data: playroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ponovo pošalji email za verifikaciju igraonice
// @route   POST /api/admin/playrooms/:id/resend-verification-email
// @access  Private (admin)
exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena.",
      });
    }

    const owner = await User.findById(playroom.vlasnikId).select(
      "ime prezime email",
    );

    if (!owner?.email) {
      return res.status(400).json({
        success: false,
        message: "Vlasnik nema email.",
      });
    }

    await sendPlayroomVerificationNotification(playroom, owner);

    res.status(200).json({
      success: true,
      message: "Email za verifikaciju je ponovo poslat adminu.",
    });
  } catch (error) {
    next(error);
  }
};
