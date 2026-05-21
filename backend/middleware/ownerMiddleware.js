const mongoose = require("mongoose");
const Playroom = require("../models/Playroom");
const ROLES = require("../constants/roles");
const ErrorResponse = require("../utils/errorResponse");

const checkOwner = async (req, res, next) => {
  try {
    const playroomId =
      req.validated?.params?.playroomId ||
      req.validated?.params?.id ||
      req.params.playroomId ||
      req.params.id;

    if (!playroomId) {
      throw new ErrorResponse("ID igraonice nije prosleđen", 400);
    }

    if (!mongoose.isValidObjectId(playroomId)) {
      throw new ErrorResponse("ID igraonice nije validan", 400);
    }

    const playroom = await Playroom.findById(playroomId)
      .select("_id vlasnikId")
      .lean();

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (req.user?.role === ROLES.ADMIN) {
      req.playroom = playroom;
      return next();
    }

    if (playroom.vlasnikId.toString() !== req.user.id) {
      throw new ErrorResponse("Nemate dozvolu za ovu igraonicu", 403);
    }

    req.playroom = playroom;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = checkOwner;
