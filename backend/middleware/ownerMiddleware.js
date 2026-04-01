const Playroom = require("../models/Playroom");

const checkOwner = async (req, res, next) => {
  try {
    const playroomId = req.params.playroomId || req.params.id;

    if (!playroomId) {
      return res.status(400).json({
        success: false,
        message: "ID igraonice nije prosleđen",
      });
    }

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // admin može sve
    if (req.user.role === "admin") {
      req.playroom = playroom;
      return next();
    }

    // vlasnik može samo svoju
    if (playroom.vlasnikId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Nemate dozvolu za ovu igraonicu",
      });
    }

    req.playroom = playroom;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkOwner;
