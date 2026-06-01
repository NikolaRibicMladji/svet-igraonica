const Playroom = require("../models/Playroom");
const ErrorResponse = require("../utils/errorResponse");
const { getNowInAppTimezone } = require("../utils/dateTime");
const User = require("../models/User");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const Notification = require("../models/Notification");
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
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
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
    const { page, limit } = req.validated.query;
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      User.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
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
    const { id } = req.validated.params;
    const result = await verifyPlayroomAndGenerateSlots(id);
    const owner = await User.findById(result.playroom.vlasnikId).select(
      "ime prezime email",
    );

    if (owner?.email) {
      await sendPlayroomApprovedEmail(result.playroom, owner);
    }

    return res.status(200).json({
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
    const { id } = req.validated.params;
    const { reason } = req.validated.body;

    const playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena.", 404);
    }

    playroom.status = PLAYROOM_STATUS.ODBIJEN;
    playroom.verifikovan = false;
    playroom.razlogOdbijanja = reason.trim();
    playroom.odbijenAt = getNowInAppTimezone();

    await playroom.save();
    const owner = await User.findById(playroom.vlasnikId).select(
      "ime prezime email",
    );

    if (owner?.email) {
      await sendPlayroomRejectedEmail(playroom, owner, reason.trim());
    }

    return res.status(200).json({
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
    const { id } = req.validated.params;
    const playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena.", 404);
    }

    const owner = await User.findById(playroom.vlasnikId).select(
      "ime prezime email",
    );

    if (!owner?.email) {
      throw new ErrorResponse("Vlasnik nema email.", 400);
    }

    await sendPlayroomVerificationNotification(playroom, owner);

    return res.status(200).json({
      success: true,
      message: "Email za verifikaciju je ponovo poslat adminu.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Kreiraj admin obaveštenje
// @route   POST /api/admin/notifications
// @access  Private (admin)
exports.createNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      targetType = "role",
      targetRole,
      targetPlayroomId,
      priority,
      expiresAt,
    } = req.validated.body;

    const now = getNowInAppTimezone();

    if (expiresAt && expiresAt <= now) {
      throw new ErrorResponse("Datum isteka mora biti u budućnosti.", 400);
    }

    let finalTargetRole = targetRole;
    let finalTargetUserId = null;
    let finalTargetPlayroomId = null;

    if (targetType === "playroom") {
      const playroom = await Playroom.findById(targetPlayroomId)
        .select("_id naziv grad vlasnikId")
        .lean();

      if (!playroom) {
        throw new ErrorResponse("Igraonica nije pronađena.", 404);
      }

      if (!playroom.vlasnikId) {
        throw new ErrorResponse("Igraonica nema povezanog vlasnika.", 400);
      }

      finalTargetRole = "vlasnik";
      finalTargetUserId = playroom.vlasnikId;
      finalTargetPlayroomId = playroom._id;
    }

    const notification = await Notification.create({
      title,
      message,
      targetType,
      targetRole: finalTargetRole,
      targetUserId: finalTargetUserId,
      targetPlayroomId: finalTargetPlayroomId,
      priority,
      expiresAt: expiresAt || null,
      active: true,
      publishedAt: now,
      createdBy: req.user.id,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("createdBy", "ime prezime email role")
      .populate("targetUserId", "ime prezime email role")
      .populate("targetPlayroomId", "naziv grad adresa vlasnikId")
      .lean();

    return res.status(201).json({
      success: true,
      data: populatedNotification,
      message: "Obaveštenje je uspešno kreirano.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati admin listu obaveštenja
// @route   GET /api/admin/notifications
// @access  Private (admin)
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      targetRole,
      targetType,
      targetPlayroomId,
      priority,
      active,
    } = req.validated.query;

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const filter = {};

    if (targetRole) {
      filter.targetRole = targetRole;
    }

    if (targetType) {
      filter.targetType = targetType;
    }

    if (targetPlayroomId) {
      filter.targetPlayroomId = targetPlayroomId;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (typeof active === "boolean") {
      filter.active = active;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate("createdBy", "ime prezime email role")
        .populate("targetUserId", "ime prezime email role")
        .populate("targetPlayroomId", "naziv grad adresa vlasnikId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deaktiviraj admin obaveštenje
// @route   PUT /api/admin/notifications/:id/deactivate
// @access  Private (admin)
exports.deactivateNotification = async (req, res, next) => {
  try {
    const { id } = req.validated.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      throw new ErrorResponse("Obaveštenje nije pronađeno.", 404);
    }

    notification.active = false;
    await notification.save();

    return res.status(200).json({
      success: true,
      data: notification,
      message: "Obaveštenje je deaktivirano.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pretraga igraonica za admin notifikacije
// @route   GET /api/admin/playrooms/search?q=...
// @access  Private (admin)
exports.searchPlayroomsForNotifications = async (req, res, next) => {
  try {
    const { q, limit } = req.validated.query;

    const search = String(q || "").trim();

    const playrooms = await Playroom.find({
      $or: [
        { naziv: { $regex: search, $options: "i" } },
        { grad: { $regex: search, $options: "i" } },
        { adresa: { $regex: search, $options: "i" } },
      ],
    })
      .select("_id naziv grad adresa vlasnikId status verifikovan")
      .populate("vlasnikId", "ime prezime email role")
      .sort({ naziv: 1, grad: 1 })
      .limit(Math.min(limit, 20))
      .lean();

    return res.status(200).json({
      success: true,
      count: playrooms.length,
      data: playrooms,
    });
  } catch (error) {
    next(error);
  }
};
