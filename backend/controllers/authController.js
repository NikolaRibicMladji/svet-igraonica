const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  getNowInAppTimezone,
  startOfDayInAppTimezone,
} = require("../utils/dateTime");
const {
  sendMail,
  sendEmailVerificationEmail,
} = require("../utils/emailService");
const authService = require("../services/authService");
const RefreshSession = require("../models/RefreshSession");
const Booking = require("../models/Booking");
const Playroom = require("../models/Playroom");
const ErrorResponse = require("../utils/errorResponse");
const BOOKING_STATUS = require("../constants/bookingStatus");
const { queueBookingEmails } = require("../services/emailQueueService");
const logger = require("../utils/logger");

const getRequestMetadata = (req) => ({
  userAgent: req.get("user-agent") || "",
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "",
});

// @desc    Registracija korisnika
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { user } = await authService.registerUser(
      req.validated.body,
      getRequestMetadata(req),
    );

    res.status(201).json({
      success: true,
      message:
        "Uspešno ste se registrovali. Proverite email adresu radi potvrde naloga.",
      user: {
        id: user._id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        telefon: user.telefon,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Prijava korisnika
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;

    const { user, accessToken, refreshToken } = await authService.loginUser(
      email,
      password,
      getRequestMetadata(req),
    );

    let hasPlayroom = false;

    if (user.role === "vlasnik") {
      const existingPlayroom = await Playroom.exists({
        vlasnikId: user._id,
      });

      hasPlayroom = Boolean(existingPlayroom);
    }

    res.cookie("refreshToken", refreshToken, authService.cookieOptions);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        telefon: user.telefon,
        role: user.role,
        emailVerified: user.emailVerified,
        hasPlayroom,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private/Public
exports.logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.cookies.refreshToken);

    res.clearCookie("refreshToken", authService.cookieOptions);

    res.status(200).json({
      success: true,
      message: "Uspešno ste se odjavili",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await authService.refreshUserToken(
      req.cookies.refreshToken,
      getRequestMetadata(req),
    );

    res.cookie("refreshToken", refreshToken, authService.cookieOptions);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trenutni korisnik
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      ime: req.user.ime,
      prezime: req.user.prezime,
      email: req.user.email,
      telefon: req.user.telefon,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
    },
  });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validated.body;

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Ne otkrivamo da li korisnik postoji
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "Ako nalog sa tom email adresom postoji, poslali smo link za reset lozinke.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minuta

    await user.save({ validateBeforeSave: false });

    if (!process.env.FRONTEND_URL) {
      throw new ErrorResponse("FRONTEND_URL nije podešen.", 500);
    }

    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");

    const resetUrl = `${frontendUrl}/reset-password/${encodeURIComponent(
      resetToken,
    )}`;

    await sendMail({
      type: "password_reset",
      to: user.email,
      subject: "Reset lozinke - Svet Igraonica",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
          <h2 style="color:#ff6b4a;">Reset lozinke</h2>
          <p>Zatražili ste promenu lozinke za vaš nalog.</p>
          <p>Kliknite na dugme ispod da postavite novu lozinku:</p>
          <p style="margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#ff6b4a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;">
              Promeni lozinku
            </a>
          </p>
          <p>Ako niste vi tražili reset lozinke, slobodno ignorišite ovaj email.</p>
          <p>Link važi 15 minuta.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message:
        "Ako nalog sa tom email adresom postoji, poslali smo link za reset lozinke.",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.validated.params;
    const { password } = req.validated.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw new ErrorResponse("Token nije validan ili je istekao.", 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    user.emailVerified = true;
    user.emailVerifiedAt = user.emailVerifiedAt || new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationLastSentAt = null;

    await user.save();

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    res.clearCookie("refreshToken", authService.cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Lozinka je uspešno promenjena.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Potvrda email adrese
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.validated.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      throw new ErrorResponse(
        "Verifikacioni link nije validan ili je istekao.",
        400,
      );
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationLastSentAt = null;

    await user.save({
      validateBeforeSave: false,
    });

    const pendingBookings = await Booking.find({
      roditeljId: user._id,
      status: BOOKING_STATUS.CEKANJE,
    })
      .select("_id")
      .lean();

    for (const booking of pendingBookings) {
      queueBookingEmails(booking._id).catch((err) => {
        logger.error("QUEUE EMAIL ERROR AFTER EMAIL VERIFY:", err.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email adresa je uspešno potvrđena.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ponovno slanje verifikacionog emaila
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.validated.body;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select(
      "+emailVerificationLastSentAt +emailVerificationToken +emailVerificationExpires",
    );

    // Ne otkrivamo da li korisnik postoji
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Ako nalog postoji i nije potvrđen, poslali smo novi email.",
      });
    }

    if (user.emailVerified) {
      throw new ErrorResponse("Email adresa je već potvrđena.", 400);
    }

    const lastSentAt = user.emailVerificationLastSentAt;

    if (lastSentAt) {
      const secondsSinceLastEmail =
        (Date.now() - new Date(lastSentAt).getTime()) / 1000;

      if (secondsSinceLastEmail < 60) {
        throw new ErrorResponse(
          "Sačekajte malo pre ponovnog slanja emaila.",
          429,
        );
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;

    user.emailVerificationExpires = Date.now() + 15 * 60 * 1000;

    user.emailVerificationLastSentAt = new Date();

    await user.save({
      validateBeforeSave: false,
    });

    const hasPendingBooking = await Booking.exists({
      roditeljId: user._id,
      status: BOOKING_STATUS.CEKANJE,
    });

    await sendEmailVerificationEmail(user, rawToken, {
      context: hasPendingBooking ? "guest_booking" : "standard_registration",
    });

    return res.status(200).json({
      success: true,
      message: "Ako nalog postoji i nije potvrđen, poslali smo novi email.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promena lozinke
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { currentPassword, newPassword } = req.validated.body;

    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new ErrorResponse("Korisnik nije pronađen.", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new ErrorResponse("Trenutna lozinka nije tačna.", 400);
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    res.clearCookie("refreshToken", authService.cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Lozinka je uspešno promenjena. Prijavite se ponovo.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promena emaila
// @route   PUT /api/auth/change-email
// @access  Private
exports.changeEmail = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { currentPassword, newEmail } = req.validated.body;

    const normalizedEmail = newEmail.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: userId },
    }).lean();

    if (existingUser) {
      throw new ErrorResponse("Email je već zauzet.", 409);
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new ErrorResponse("Korisnik nije pronađen.", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new ErrorResponse("Trenutna lozinka nije tačna.", 400);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.email = normalizedEmail;

    user.emailVerified = false;
    user.emailVerifiedAt = null;

    user.emailVerificationToken = hashedToken;

    user.emailVerificationExpires = Date.now() + 15 * 60 * 1000;

    user.emailVerificationLastSentAt = new Date();

    await user.save();

    await sendEmailVerificationEmail(user, rawToken);

    // 🔄 Sync email sa igraonicom vlasnika
    if (user.role === "vlasnik") {
      await Playroom.updateOne(
        { vlasnikId: user._id },
        {
          $set: {
            kontaktEmail: normalizedEmail,
          },
        },
      );
    }

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    res.clearCookie("refreshToken", authService.cookieOptions);

    return res.status(200).json({
      success: true,
      message:
        "Email je uspešno promenjen. Proverite novu email adresu radi potvrde naloga.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Brisanje naloga
// @route   DELETE /api/auth/delete-account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { currentPassword } = req.validated.body;

    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new ErrorResponse("Korisnik nije pronađen.", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new ErrorResponse("Trenutna lozinka nije tačna.", 400);
    }

    // RODITELJ — zabrana ako ima buduće rezervacije
    if (user.role === "roditelj") {
      const now = getNowInAppTimezone();
      const startOfToday = startOfDayInAppTimezone(now);
      const activeBookings = await Booking.countDocuments({
        roditeljId: user._id,
        status: {
          $in: [BOOKING_STATUS.CEKANJE, BOOKING_STATUS.POTVRDJENO],
        },
        datum: { $gte: startOfToday },
      });

      if (activeBookings > 0) {
        throw new ErrorResponse(
          "Ne možete obrisati nalog dok imate aktivne rezervacije.",
          400,
        );
      }
    }

    // VLASNIK — zabrana ako ima igraonicu
    if (user.role === "vlasnik") {
      const existingPlayroom = await Playroom.exists({
        vlasnikId: user._id,
      });

      if (existingPlayroom) {
        throw new ErrorResponse(
          "Ne možete obrisati nalog dok imate registrovanu igraonicu.",
          400,
        );
      }
    }

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    await User.findByIdAndDelete(user._id);

    res.clearCookie("refreshToken", authService.cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Nalog je uspešno obrisan.",
    });
  } catch (error) {
    next(error);
  }
};
