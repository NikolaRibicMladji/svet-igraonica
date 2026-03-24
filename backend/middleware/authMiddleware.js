const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  // Proveri da li token postoji u headeru
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Niste prijavljeni. Molimo prijavite se.",
    });
  }

  try {
    // Verifikuj token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Pronađi korisnika
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik više ne postoji.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Greška pri verifikaciji tokena:", error);
    return res.status(401).json({
      success: false,
      message: "Niste autorizovani. Token nije validan.",
    });
  }
};

// Provera da li je admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Pristup zabranjen. Samo za administratore.",
    });
  }
};

// Provera da li je vlasnik igraonice
exports.vlasnik = (req, res, next) => {
  if (req.user && (req.user.role === "vlasnik" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Pristup zabranjen. Samo za vlasnike igraonica.",
    });
  }
};
