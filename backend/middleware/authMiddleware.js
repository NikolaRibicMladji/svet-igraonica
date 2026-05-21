const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");

const protect = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      throw new ErrorResponse("Niste autorizovani (nema tokena)", 401);
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      if (!decoded?.id || !mongoose.isValidObjectId(decoded.id)) {
        throw new ErrorResponse("Token nije validan", 401);
      }
    } catch (err) {
      throw new ErrorResponse("Token nije validan", 401);
    }

    const user = await User.findById(decoded.id).select("-password").lean();

    if (!user) {
      throw new ErrorResponse("Korisnik ne postoji", 401);
    }

    if (!user.emailVerified) {
      throw new ErrorResponse("Morate potvrditi email adresu.", 403);
    }

    req.user = user;
    req.user.id = String(user._id);

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };
