const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generisanje JWT tokena
const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Registracija korisnika
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { ime, prezime, email, password, telefon, role, deca } = req.body;

    console.log("Primljeni podaci:", { ime, prezime, email, telefon, role });

    // Proveri da li korisnik već postoji
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Korisnik sa ovom email adresom već postoji",
      });
    }

    // ŠIFROVANJE LOZINKE - DIREKTNO OVDE
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Kreiraj korisnika sa šifrovanom lozinkom
    const user = await User.create({
      ime,
      prezime,
      email,
      password: hashedPassword, // <-- šifrovana lozinka
      telefon,
      role: role || "roditelj",
      deca: deca || [],
    });

    console.log("Korisnik kreiran:", user._id);

    // Generiši token
    const token = generateToken(user._id, user.email, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        telefon: user.telefon,
        role: user.role,
        deca: user.deca,
      },
    });
  } catch (error) {
    console.error("Greška pri registraciji:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};

// @desc    Prijava korisnika
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Prijava pokušaj:", email);

    // Proveri da li su email i password poslati
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Molimo unesite email i lozinku",
      });
    }

    // Pronađi korisnika
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Pogrešan email ili lozinka",
      });
    }

    // Proveri lozinku koristeći bcrypt direktno
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Pogrešan email ili lozinka",
      });
    }

    // Generiši token
    const token = generateToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        telefon: user.telefon,
        role: user.role,
        deca: user.deca,
      },
    });
  } catch (error) {
    console.error("Greška pri prijavi:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};

// @desc    Dohvati trenutnog korisnika (profil)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};
