const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const generateAccessToken = require("../utils/generateToken");
const ROLES = require("../constants/roles");
const RefreshSession = require("../models/RefreshSession");
const { sendEmailVerificationEmail } = require("../utils/emailService");

const EMAIL_VERIFICATION_EXPIRES_MINUTES = 15;
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000,
  );

  return {
    rawToken,
    hashedToken,
    expiresAt,
  };
};

const getRefreshTokenExpiryDate = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

const generateRefreshToken = (user, sessionId) => {
  return jwt.sign(
    {
      id: user._id,
      sid: sessionId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    },
  );
};

const generateAuthResponse = async (user, session = null, metadata = {}) => {
  const refreshSession = await RefreshSession.create(
    [
      {
        userId: user._id,
        tokenHash: "PENDING",
        expiresAt: getRefreshTokenExpiryDate(),
        userAgent: metadata.userAgent || "",
        ipAddress: metadata.ipAddress || "",
      },
    ],
    session ? { session } : {},
  ).then((docs) => docs[0]);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(
    user,
    refreshSession._id.toString(),
  );
  const refreshTokenHash = hashToken(refreshToken);

  refreshSession.tokenHash = refreshTokenHash;
  await refreshSession.save(session ? { session } : {});

  // 🔥 cleanup starih sesija
  await RefreshSession.updateMany(
    {
      userId: user._id,
      revokedAt: null,
      _id: { $ne: refreshSession._id },
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    {
      $set: { revokedAt: new Date() },
    },
  );

  return { accessToken, refreshToken };
};

const createParentUser = async ({
  ime,
  prezime,
  email,
  password,
  telefon,
  role = ROLES.RODITELJ,
  acceptedTerms,

  session = null,
}) => {
  const normalizedEmail = normalizeEmail(email);

  const existingQuery = User.findOne({ email: normalizedEmail });
  if (session) {
    existingQuery.session(session);
  }

  existingQuery.lean();

  const userExists = await existingQuery;

  if (userExists) {
    throw createError("Korisnik sa ovom email adresom već postoji", 400);
  }

  const { hashedToken, expiresAt, rawToken } = generateEmailVerificationToken();

  const hashedPassword = await hashPassword(password);

  const createdUsers = await User.create(
    [
      {
        ime: ime?.trim(),
        prezime: prezime?.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        telefon: telefon?.trim(),
        role,
        acceptedTerms: acceptedTerms === true,
        acceptedTermsAt: acceptedTerms === true ? new Date() : null,
        emailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpires: expiresAt,
        emailVerificationLastSentAt: new Date(),
      },
    ],
    session ? { session } : {},
  );

  return {
    user: createdUsers[0],
    emailVerificationToken: rawToken,
  };
};

exports.registerUser = async (data, metadata = {}) => {
  const { ime, prezime, email, password, telefon, role, acceptedTerms } = data;
  if (acceptedTerms !== true) {
    throw createError(
      "Morate prihvatiti uslove korišćenja i politiku privatnosti.",
      400,
    );
  }
  if (!role) {
    throw createError("Tip korisnika je obavezan", 400);
  }

  const allowedRoles = [ROLES.RODITELJ, ROLES.VLASNIK];

  if (!allowedRoles.includes(role)) {
    throw createError("Nevalidna korisnička rola", 400);
  }

  const userRole = role;

  const { user, emailVerificationToken } = await createParentUser({
    ime,
    prezime,
    email,
    password,
    telefon,
    role: userRole,
    acceptedTerms,
  });

  await sendEmailVerificationEmail(user, emailVerificationToken);

  return { user };
};

exports.loginUser = async (email, password, metadata = {}) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password",
  );

  if (!user) {
    throw createError("Pogrešan email ili lozinka", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw createError("Pogrešan email ili lozinka", 401);
  }

  if (!user.emailVerified) {
    throw createError("Morate potvrditi email adresu.", 403);
  }

  const tokens = await generateAuthResponse(user, null, metadata);

  return { user, ...tokens };
};

exports.refreshUserToken = async (refreshToken, metadata = {}) => {
  if (!refreshToken) {
    throw createError("Niste autorizovani", 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw createError("Refresh token je istekao", 401);
    }

    throw createError("Refresh token nije validan", 401);
  }

  if (!decoded?.sid) {
    throw createError("Refresh token nema validnu sesiju", 401);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw createError("Korisnik ne postoji", 401);
  }

  const sessionDoc = await RefreshSession.findOneAndUpdate(
    {
      _id: decoded.sid,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (!sessionDoc) {
    throw createError("Sesija više nije aktivna", 401);
  }

  if (String(sessionDoc.userId) !== String(user._id)) {
    throw createError("Sesija ne pripada korisniku", 401);
  }

  if (
    sessionDoc.userAgent &&
    metadata.userAgent &&
    sessionDoc.userAgent !== metadata.userAgent
  ) {
    await RefreshSession.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    throw createError(
      "Detektovana je sumnjiva sesija. Prijavite se ponovo.",
      401,
    );
  }

  if (sessionDoc.expiresAt <= new Date()) {
    throw createError("Refresh token je istekao", 401);
  }

  const incomingHash = hashToken(refreshToken);

  if (incomingHash !== sessionDoc.tokenHash) {
    await RefreshSession.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    throw createError("Sesija kompromitovana. Prijavite se ponovo.", 401);
  }

  const newSession = await RefreshSession.create([
    {
      userId: user._id,
      tokenHash: "PENDING",
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: metadata.userAgent || sessionDoc.userAgent || "",
      ipAddress: metadata.ipAddress || sessionDoc.ipAddress || "",
    },
  ]).then((docs) => docs[0]);

  const accessToken = generateAccessToken(user);

  const newRefreshToken = generateRefreshToken(user, newSession._id.toString());

  const newRefreshTokenHash = hashToken(newRefreshToken);

  newSession.tokenHash = newRefreshTokenHash;

  await newSession.save();

  // cleanup starih sesija
  await RefreshSession.updateMany(
    {
      userId: user._id,
      revokedAt: null,
      _id: { $ne: newSession._id },
      createdAt: {
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

exports.logoutUser = async (refreshToken) => {
  if (!refreshToken) return;

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });

    if (!decoded?.sid) return;

    await RefreshSession.findByIdAndUpdate(decoded.sid, {
      $set: { revokedAt: new Date() },
    });
  } catch (error) {
    // Ne pucamo logout čak i ako je token nevalidan ili istekao
  }
};

exports.registerGuestParent = async (data, session = null) => {
  const { ime, prezime, email, password, telefon, acceptedTerms } = data;
  if (acceptedTerms !== true) {
    throw createError(
      "Morate prihvatiti uslove korišćenja i politiku privatnosti.",
      400,
    );
  }
  const normalizedEmail = normalizeEmail(email);

  const existingQuery = User.findOne({ email: normalizedEmail });
  if (session) {
    existingQuery.session(session);
  }

  existingQuery.lean();

  const userExists = await existingQuery;

  if (userExists) {
    throw createError(
      "Korisnik sa ovom email adresom već postoji. Prijavite se da biste završili rezervaciju.",
      400,
    );
  }

  const { user } = await createParentUser({
    ime,
    prezime,
    email: normalizedEmail,
    password,
    telefon,
    role: ROLES.RODITELJ,
    acceptedTerms,

    session,
  });

  const { accessToken, refreshToken } = await generateAuthResponse(
    user,
    session,
    {},
  );

  return {
    user,
    accessToken,
    refreshToken,
  };
};

exports.cookieOptions = REFRESH_TOKEN_COOKIE_OPTIONS;
