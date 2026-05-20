==================================================
auth-security-rules
==================================================

# Auth & Security Rules

## Auth Sistem

Platforma koristi:

- access token
- refresh token
- refresh token rotation
- hashed refresh sessions

Refresh token:

- čuva se u httpOnly cookie
- secure cookie u production
- ne sme biti dostupan frontend JavaScript-u

## Access Token

Access token:

- koristi se za autorizaciju API poziva
- šalje se kroz Authorization Bearer header

Frontend koristi:

- axios interceptor
- automatski refresh token flow

## Refresh Session

Refresh session model:

- userId
- tokenHash
- expiresAt
- revokedAt

Logout mora:

- revoke refresh token
- invalidirati refresh session
- obrisati cookie

## Middleware

Koristiti:

- authMiddleware
- roleMiddleware
- ownerMiddleware
- validation middleware

## Security Middleware

Backend mora koristiti:

- helmet
- express-rate-limit
- mongo-sanitize
- xss-clean
- cookie-parser

## Validacija

Obavezno:

- validirati sve inpute
- validirati ObjectId
- sanitize request body
- koristiti validation middleware

Nikada:

- ne verovati frontend podacima
- ne koristiti raw req.body bez validacije

## Password Pravila

Password:

- mora biti hashovan
- nikada se ne vraća frontend-u
- nikada se ne loguje

## API Pravila

API mora imati:

- konzistentne error response
- proper status codes
- auth zaštitu ruta

Ne vraćati:

- sensitive podatke
- password
- token hash
- interne greške baze

## Booking Security

Booking sistem mora imati:

- race condition zaštitu
- transaction/session zaštitu
- unique booking protection

## Database Pravila

Koristiti:

- indekse
- optimizovane query-je
- lean queries gde je moguće

Izbegavati:

- N+1 problem
- nepotrebne populate pozive

## Production Pravila

Production kod mora:

- biti optimizovan
- imati proper error handling
- imati centralizovan error middleware
- koristiti async/await
- koristiti try/catch

## Zabranjeno

Ne sme:

- business logika u middleware
- business logika u React komponentama
- direktan database access iz frontend-a
- hardcoded secrets
- hardcoded API URL

==================================================
FILE: authController.js
==================================================
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
sendMail,
sendEmailVerificationEmail,
} = require("../utils/emailService");
const authService = require("../services/authService");
const RefreshSession = require("../models/RefreshSession");
const Booking = require("../models/Booking");
const Playroom = require("../models/Playroom");
const BOOKING_STATUS = require("../constants/bookingStatus");

const getRequestMetadata = (req) => ({
userAgent: req.get("user-agent") || "",
ipAddress:
req.ip ||
req.headers["x-forwarded-for"] ||
req.connection?.remoteAddress ||
"",
});

// @desc Registracija korisnika
// @route POST /api/auth/register
// @access Public
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

// @desc Prijava korisnika
// @route POST /api/auth/login
// @access Public
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
        hasPlayroom,
      },
    });

} catch (error) {
next(error);
}
};

// @desc Logout
// @route POST /api/auth/logout
// @access Private/Public
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

// @desc Refresh token
// @route POST /api/auth/refresh
// @access Public
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

// @desc Trenutni korisnik
// @route GET /api/auth/me
// @access Private
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

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");

    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    await sendMail({
      from: `"Svet Igraonica" <${process.env.EMAIL_FROM}>`,
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

// @desc Potvrda email adrese
// @route GET /api/auth/verify-email/:token
// @access Public
exports.verifyEmail = async (req, res, next) => {
try {
const { token } = req.validated.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verifikacioni link nije validan ili je istekao.",
      });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationLastSentAt = null;

    await user.save({
      validateBeforeSave: false,
    });

    return res.status(200).json({
      success: true,
      message: "Email adresa je uspešno potvrđena.",
    });

} catch (error) {
next(error);
}
};

// @desc Ponovno slanje verifikacionog emaila
// @route POST /api/auth/resend-verification
// @access Public
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
      return res.status(400).json({
        success: false,
        message: "Email adresa je već potvrđena.",
      });
    }

    const lastSentAt = user.emailVerificationLastSentAt;

    if (lastSentAt) {
      const secondsSinceLastEmail =
        (Date.now() - new Date(lastSentAt).getTime()) / 1000;

      if (secondsSinceLastEmail < 60) {
        return res.status(429).json({
          success: false,
          message: "Sačekajte malo pre ponovnog slanja emaila.",
        });
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

    await sendEmailVerificationEmail(user, rawToken);

    return res.status(200).json({
      success: true,
      message: "Ako nalog postoji i nije potvrđen, poslali smo novi email.",
    });

} catch (error) {
next(error);
}
};

// @desc Promena lozinke
// @route PUT /api/auth/change-password
// @access Private
exports.changePassword = async (req, res, next) => {
try {
const userId = req.user.\_id;

    const { currentPassword, newPassword } = req.validated.body;

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Trenutna lozinka nije tačna.",
      });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message: "Lozinka je uspešno promenjena. Prijavite se ponovo.",
    });

} catch (error) {
next(error);
}
};

// @desc Promena emaila
// @route PUT /api/auth/change-email
// @access Private
exports.changeEmail = async (req, res, next) => {
try {
const userId = req.user.\_id;

    const { currentPassword, newEmail } = req.validated.body;

    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email je već zauzet.",
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Trenutna lozinka nije tačna.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.email = newEmail;

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
            kontaktEmail: newEmail,
          },
        },
      );
    }

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message:
        "Email je uspešno promenjen. Proverite novu email adresu radi potvrde naloga.",
    });

} catch (error) {
next(error);
}
};

// @desc Brisanje naloga
// @route DELETE /api/auth/delete-account
// @access Private
exports.deleteAccount = async (req, res, next) => {
try {
const userId = req.user.\_id;

    const { currentPassword } = req.validated.body;

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Trenutna lozinka nije tačna.",
      });
    }

    // RODITELJ — zabrana ako ima buduće rezervacije
    if (user.role === "roditelj") {
      const activeBookings = await Booking.countDocuments({
        roditeljId: user._id,
        status: {
          $in: [BOOKING_STATUS.CEKANJE, BOOKING_STATUS.POTVRDJENO],
        },
        datum: { $gte: new Date() },
      });

      if (activeBookings > 0) {
        return res.status(400).json({
          success: false,
          message: "Ne možete obrisati nalog dok imate aktivne rezervacije.",
        });
      }
    }

    // VLASNIK — zabrana ako ima igraonicu
    if (user.role === "vlasnik") {
      const existingPlayroom = await Playroom.findOne({
        vlasnikId: user._id,
      });

      if (existingPlayroom) {
        return res.status(400).json({
          success: false,
          message: "Ne možete obrisati nalog dok imate registrovanu igraonicu.",
        });
      }
    }

    await RefreshSession.deleteMany({
      userId: user._id,
    });

    await User.findByIdAndDelete(user._id);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message: "Nalog je uspešno obrisan.",
    });

} catch (error) {
next(error);
}
};

==================================================
FILE: authMiddleware.js
==================================================
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
try {
let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Niste autorizovani (nema tokena)",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token nije validan",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik ne postoji",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Morate potvrditi email adresu.",
      });
    }

    req.user = user;

    next();

} catch (error) {
next(error);
}
};

module.exports = { protect };

==================================================
FILE: RefreshSession.js
==================================================
const mongoose = require("mongoose");

const RefreshSessionSchema = new mongoose.Schema(
{
userId: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
index: true,
},

    tokenHash: {
      type: String,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    replacedByTokenHash: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

},
{
timestamps: true,
},
);

RefreshSessionSchema.index({ userId: 1, createdAt: -1 });
RefreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshSession", RefreshSessionSchema);

==================================================
FILE: User.js
==================================================
const mongoose = require("mongoose");
const ROLES = require("../constants/roles");

const deteSchema = new mongoose.Schema(
{
ime: {
type: String,
trim: true,
maxlength: 100,
},
godiste: {
type: Number,
min: 1900,
max: new Date().getFullYear(),
},
},
{ \_id: false },
);

const UserSchema = new mongoose.Schema(
{
email: {
type: String,
required: [true, "Email je obavezan"],
unique: true,
lowercase: true,
trim: true,
match: [/^\S+@\S+\.\S+$/, "Email nije validan"],
index: true,
},

    password: {
      type: String,
      required: [true, "Lozinka je obavezna"],
      minlength: 6,
      select: false,
    },

    ime: {
      type: String,
      required: [true, "Ime je obavezno"],
      trim: true,
      maxlength: 100,
    },

    prezime: {
      type: String,
      required: [true, "Prezime je obavezno"],
      trim: true,
      maxlength: 100,
    },

    telefon: {
      type: String,
      required: [true, "Telefon je obavezan"],
      trim: true,
      maxlength: 30,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },

    acceptedTerms: {
      type: Boolean,
      required: [true, "Prihvatanje uslova korišćenja je obavezno"],
      default: false,
    },

    acceptedTermsAt: {
      type: Date,
      default: null,
    },

    deca: {
      type: [deteSchema],
      default: [],
    },

    passwordResetToken: {
      type: String,
      default: undefined,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: undefined,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    emailVerificationToken: {
      type: String,
      default: undefined,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      default: undefined,
      select: false,
    },

    emailVerificationLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

},
{
timestamps: true,
},
);

// Brzi lookup za login
UserSchema.index({ email: 1 });

// Brži lookup za role-based upite
UserSchema.index({ role: 1 });
UserSchema.index({ emailVerificationToken: 1 });

// Uklanja sensitive podatke kad se šalje JSON
UserSchema.methods.toJSON = function () {
const obj = this.toObject();
delete obj.password;

delete obj.passwordResetToken;
delete obj.passwordResetExpires;
delete obj.emailVerificationToken;
delete obj.emailVerificationExpires;
delete obj.emailVerificationLastSentAt;
delete obj.\_\_v;
return obj;
};

module.exports = mongoose.model("User", UserSchema);

==================================================
FILE: api.js
==================================================
import axios from "axios";

const API_BASE_URL = (
process.env.REACT_APP_API_URL ||
"https://svet-igraonica-backend.onrender.com/api"
).replace(/\/$/, "");

const api = axios.create({
baseURL: API_BASE_URL,
withCredentials: true,
});

api.interceptors.request.use(
(config) => {
const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;

},
(error) => Promise.reject(error),
);

api.interceptors.response.use(
(response) => response,
async (error) => {
const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/logout")
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const accessToken = refreshResponse.data?.accessToken;

        if (!accessToken) {
          throw new Error("Novi access token nije vraćen.");
        }

        localStorage.setItem("accessToken", accessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);

},
);

export default api;

==================================================
FILE: AuthContext.js
==================================================
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export const AuthProvider = ({ children }) => {
const [user, setUser] = useState(() => {
try {
const storedUser = localStorage.getItem(USER_KEY);
return storedUser ? JSON.parse(storedUser) : null;
} catch {
return null;
}
});

const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const setAuthData = (userData, token) => {
if (token) {
localStorage.setItem(TOKEN_KEY, token);
}

    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
    }

};

const clearAuthData = () => {
localStorage.removeItem(TOKEN_KEY);
localStorage.removeItem(USER_KEY);
setUser(null);
setError(null);
};

const loadUser = async () => {
try {
const response = await api.get("/auth/me");
const loadedUser = response?.data?.user;

      if (loadedUser) {
        setUser(loadedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(loadedUser));
        return loadedUser;
      }

      clearAuthData();
      return null;
    } catch (err) {
      console.error("Greška pri učitavanju korisnika:", err);
      clearAuthData();
      return null;
    } finally {
      setLoading(false);
    }

};

useEffect(() => {
const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    loadUser();

}, []);

const handleAuthSuccess = (response, fallbackUserData = null) => {
const payload =
response?.data?.accessToken || response?.data?.user
? response.data
: response;

    const authData =
      payload?.data?.accessToken || payload?.data?.user
        ? payload.data
        : payload;

    const token = authData?.accessToken || authData?.token || null;
    const userDataRes = authData?.user
      ? {
          ...authData.user,
          email: authData.user.email || fallbackUserData?.email || "",
        }
      : null;

    if (!token || !userDataRes) {
      console.error("handleAuthSuccess: nedostaju token ili user", response);
      return {
        success: false,
        error: "Nije moguće sačuvati prijavu korisnika.",
      };
    }

    setAuthData(userDataRes, token);

    return { success: true, user: userDataRes };

};

const handleAuthError = (err, fallbackMessage) => {
const msg = err?.response?.data?.message || fallbackMessage;
setError(msg);
return { success: false, error: msg };
};

const register = async (userData) => {
setError(null);

    try {
      const pendingEmail = userData?.email?.trim().toLowerCase();

      if (pendingEmail) {
        localStorage.setItem("pendingVerificationEmail", pendingEmail);
      }

      const response = await api.post("/auth/register", userData);

      return {
        success: true,
        message:
          response?.data?.message ||
          "Proverite email adresu radi potvrde naloga.",
        user: response?.data?.user || null,
      };
    } catch (err) {
      return handleAuthError(err, "Greška pri registraciji.");
    }

};

const login = async (email, password) => {
setError(null);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      return handleAuthSuccess(response);
    } catch (err) {
      return handleAuthError(err, "Greška pri prijavi.");
    }

};

const logout = async () => {
try {
await api.post("/auth/logout");
} catch (err) {
console.error("Logout error:", err);
} finally {
clearAuthData();
}
};

const changePassword = async (payload) => {
setError(null);

    try {
      const response = await api.put("/auth/change-password", payload);
      clearAuthData();

      return {
        success: true,
        message: response.data?.message || "Lozinka je promenjena.",
      };
    } catch (err) {
      return handleAuthError(err, "Greška pri promeni lozinke.");
    }

};

const changeEmail = async (payload) => {
setError(null);

    try {
      const response = await api.put("/auth/change-email", payload);
      clearAuthData();

      return {
        success: true,
        message: response.data?.message || "Email je promenjen.",
      };
    } catch (err) {
      return handleAuthError(err, "Greška pri promeni emaila.");
    }

};

const deleteAccount = async (payload) => {
setError(null);

    try {
      const response = await api.delete("/auth/delete-account", {
        data: payload,
      });

      clearAuthData();

      return {
        success: true,
        message: response.data?.message || "Nalog je obrisan.",
      };
    } catch (err) {
      return handleAuthError(err, "Greška pri brisanju naloga.");
    }

};

const value = {
user,
loading,
error,
register,
login,
logout,
changePassword,
changeEmail,
deleteAccount,
loadUser,
handleAuthSuccess,
isAuthenticated: Boolean(user),
};

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
