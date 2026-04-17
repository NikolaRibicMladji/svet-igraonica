const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const generateAccessToken = require("../utils/generateToken");
const ROLES = require("../constants/roles");

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeEmail = (email) => email?.trim().toLowerCase();

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

const generateAuthResponse = async (user, session = null) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const refreshTokenHash = hashToken(refreshToken);

  user.refreshTokenHash = refreshTokenHash;
  await user.save(session ? { session } : {});

  return { accessToken, refreshToken };
};

const createParentUser = async ({
  ime,
  prezime,
  email,
  password,
  telefon,
  role = ROLES.RODITELJ,
  deca = [],
  session = null,
}) => {
  const normalizedEmail = normalizeEmail(email);

  const existingQuery = User.findOne({ email: normalizedEmail });
  if (session) {
    existingQuery.session(session);
  }

  const userExists = await existingQuery;

  if (userExists) {
    throw createError("Korisnik sa ovom email adresom već postoji", 400);
  }

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
        deca: Array.isArray(deca) ? deca : [],
      },
    ],
    session ? { session } : {},
  );

  return createdUsers[0];
};

exports.registerUser = async (data) => {
  const { ime, prezime, email, password, telefon, role, deca } = data;

  const userRole = role === ROLES.VLASNIK ? ROLES.VLASNIK : ROLES.RODITELJ;

  const user = await createParentUser({
    ime,
    prezime,
    email,
    password,
    telefon,
    role: userRole,
    deca,
  });

  const tokens = await generateAuthResponse(user);

  return { user, ...tokens };
};

exports.loginUser = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password +refreshTokenHash",
  );

  if (!user) {
    throw createError("Pogrešan email ili lozinka", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw createError("Pogrešan email ili lozinka", 401);
  }

  const tokens = await generateAuthResponse(user);

  return { user, ...tokens };
};

exports.refreshUserToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError("Niste autorizovani", 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw createError("Refresh token je istekao", 401);
    }

    throw createError("Refresh token nije validan", 401);
  }

  const user = await User.findById(decoded.id).select("+refreshTokenHash");

  if (!user) {
    throw createError("Korisnik ne postoji", 401);
  }

  if (!user.refreshTokenHash) {
    throw createError("Sesija više nije aktivna", 401);
  }

  const incomingHash = hashToken(refreshToken);

  if (incomingHash !== user.refreshTokenHash) {
    throw createError("Refresh token nije validan", 401);
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

exports.logoutUser = async (refreshToken) => {
  if (!refreshToken) return;

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select("+refreshTokenHash");

    if (!user) return;

    user.refreshTokenHash = null;
    await user.save();
  } catch (error) {
    // Ne pucamo logout čak i ako je token nevalidan ili istekao
  }
};

exports.registerGuestParent = async (data, session = null) => {
  const { ime, prezime, email, password, telefon } = data;

  const normalizedEmail = normalizeEmail(email);

  const existingQuery = User.findOne({ email: normalizedEmail });
  if (session) {
    existingQuery.session(session);
  }

  const userExists = await existingQuery;

  if (userExists) {
    throw createError(
      "Korisnik sa ovom email adresom već postoji. Prijavite se da biste završili rezervaciju.",
      400,
    );
  }

  const user = await createParentUser({
    ime,
    prezime,
    email: normalizedEmail,
    password,
    telefon,
    role: ROLES.RODITELJ,
    deca: [],
    session,
  });

  const { accessToken, refreshToken } = await generateAuthResponse(
    user,
    session,
  );

  return {
    user,
    accessToken,
    refreshToken,
  };
};

exports.cookieOptions = REFRESH_TOKEN_COOKIE_OPTIONS;
