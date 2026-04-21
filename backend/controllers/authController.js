const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendMail } = require("../utils/emailService");
const authService = require("../services/authService");

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
    const { user, accessToken, refreshToken } = await authService.registerUser(
      req.validated.body,
      getRequestMetadata(req),
    );

    res.cookie("refreshToken", refreshToken, authService.cookieOptions);

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        telefon: user.telefon,
        role: user.role,
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

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

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
    user: req.user,
  });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validated.body;

    const normalizedEmail = email;
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

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendMail({
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
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
      return res.status(400).json({
        success: false,
        message: "Token nije validan ili je istekao.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Lozinka je uspešno promenjena.",
    });
  } catch (error) {
    next(error);
  }
};
