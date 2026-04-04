const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const generateAccessToken = require("../utils/generateToken");
const ROLES = require("../constants/roles");

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const generateAuthResponse = (user) => {
  const accessToken = generateAccessToken(user);

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
};

exports.registerUser = async (data) => {
  const { ime, prezime, email, password, telefon, role, deca } = data;

  const normalizedEmail = email?.trim().toLowerCase();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    throw new Error("Korisnik sa ovom email adresom već postoji");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const userRole = role === ROLES.VLASNIK ? ROLES.VLASNIK : ROLES.RODITELJ;

  const user = await User.create({
    ime: ime?.trim(),
    prezime: prezime?.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    telefon: telefon?.trim(),
    role: userRole,
    deca: Array.isArray(deca) ? deca : [],
  });

  const tokens = generateAuthResponse(user);

  return { user, ...tokens };
};

exports.loginUser = async (email, password) => {
  const normalizedEmail = email?.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password",
  );

  if (!user) {
    throw new Error("Pogrešan email ili lozinka");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Pogrešan email ili lozinka");
  }

  const tokens = generateAuthResponse(user);

  return { user, ...tokens };
};

exports.refreshUserToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Niste autorizovani");
  }

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new Error("Korisnik ne postoji");
  }

  const accessToken = generateAccessToken(user);

  return { accessToken };
};

exports.registerGuestParent = async (data) => {
  const { ime, prezime, email, password, telefon } = data;

  const normalizedEmail = email?.trim().toLowerCase();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    const error = new Error(
      "Korisnik sa ovom email adresom već postoji. Prijavite se da biste završili rezervaciju.",
    );
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    ime: ime?.trim(),
    prezime: prezime?.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    telefon: telefon?.trim(),
    role: ROLES.RODITELJ,
    deca: [],
  });

  const { accessToken, refreshToken } = generateAuthResponse(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

exports.cookieOptions = REFRESH_TOKEN_COOKIE_OPTIONS;
