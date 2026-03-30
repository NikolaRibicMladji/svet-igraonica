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

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Korisnik sa ovom email adresom već postoji",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      ime,
      prezime,
      email,
      password: hashedPassword,
      telefon,
      role: role === "vlasnik" ? "vlasnik" : "roditelj",
      deca: deca || [],
    });

    // --- BRUTALNI DEO ZA REGISTRACIJU ---
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      accessToken, // Vraćamo accessToken
      user: {
        id: user._id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Greška na serveru" });
  }
};

// @desc    Prijava korisnika
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, lozinka } = req.body;

  try {
    // 1. Provera korisnika
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Pogrešan email ili lozinka" });
    }

    // 2. Provera lozinke
    const isMatch = await bcrypt.compare(lozinka, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Pogrešan email ili lozinka" });
    }

    // 3. Generiši Access Token (kratkotrajan - 15 minuta)
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // 4. Generiši Refresh Token (dugotrajan - 7 dana)
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    // 5. Postavi Refresh Token u HTTP-Only kolačić
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Sprečava XSS napade (JS ne može da čita ovo)
      secure: process.env.NODE_ENV === "production", // Samo preko HTTPS u produkciji
      sameSite: "strict", // Sprečava CSRF napade
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dana
    });

    // 6. Odgovori frontendu (bez refresh tokena u body-ju!)
    res.json({
      message: "Uspešna prijava",
      accessToken, // Šaljemo samo access token
      user: {
        id: user._id,
        ime: user.ime,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Greška na serveru" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ message: "Uspešno ste se odjavili" });
};

exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ message: "Niste autorizovani (nema refresh tokena)" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Korisnik više ne postoji" });
    }

    // Ako je sve OK, dajemo mu novi kratki Access Token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: "Refresh token nije validan" });
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
