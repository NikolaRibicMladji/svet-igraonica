const Playroom = require("../models/Playroom");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");

// @desc    Kreiraj novu igraonicu (samo vlasnici)
// @route   POST /api/playrooms
// @access  Private (vlasnik ili admin)
exports.createPlayroom = async (req, res) => {
  try {
    // Dodaj vlasnika iz tokena
    req.body.vlasnikId = req.user.id;

    // Proveri da li već postoji igraonica sa istim imenom
    const postoji = await Playroom.findOne({ naziv: req.body.naziv });
    if (postoji) {
      return res.status(400).json({
        success: false,
        message: "Igraonica sa ovim imenom već postoji",
      });
    }

    const playroom = await Playroom.create(req.body);

    // Automatski generiši termine za narednih 30 dana
    console.log(`🔄 Generišem termine za ${playroom.naziv}...`);
    const result = await generateTimeSlotsForPlayroom(playroom._id, 30);
    console.log(`✅ Generisano ${result.createdCount} termina`);

    res.status(201).json({
      success: true,
      data: playroom,
      message: `Igraonica je kreirana. ${result.createdCount} termina je automatski generisano.`,
    });
  } catch (error) {
    console.error("Greška pri kreiranju igraonice:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};

// @desc    Dohvati sve verifikovane igraonice (sa filtriranjem)
// @route   GET /api/playrooms
// @access  Public
exports.getAllPlayrooms = async (req, res) => {
  try {
    const { grad, minCena, maxCena, pogodnosti, minRating, sortBy } = req.query;

    // Osnovni filter - samo verifikovane i aktivne igraonice
    let query = { verifikovan: true, status: "aktivan" };

    // Filter po gradu
    if (grad && grad !== "svi") {
      query.grad = grad;
    }

    // Filter po ceni (koristi osnovnaCena iz novog modela)
    if (minCena || maxCena) {
      query.osnovnaCena = {};
      if (minCena) query.osnovnaCena.$gte = parseInt(minCena);
      if (maxCena) query.osnovnaCena.$lte = parseInt(maxCena);
    }

    // Filter po oceni
    if (minRating && minRating !== "sve") {
      query.rating = { $gte: parseInt(minRating) };
    }

    // Filter po besplatnim pogodnostima
    if (pogodnosti) {
      const pogodnostiArray = pogodnosti.split(",");
      query.besplatnePogodnosti = { $in: pogodnostiArray };
    }

    // Sortiranje
    let sort = { createdAt: -1 }; // default: najnovije prvo
    if (sortBy === "rating") {
      sort = { rating: -1 };
    } else if (sortBy === "price_asc") {
      sort = { osnovnaCena: 1 };
    } else if (sortBy === "price_desc") {
      sort = { osnovnaCena: -1 };
    }

    const playrooms = await Playroom.find(query).select("-__v").sort(sort);

    res.status(200).json({
      success: true,
      count: playrooms.length,
      data: playrooms,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati jednu igraonicu po ID
// @route   GET /api/playrooms/:id
// @access  Public
exports.getPlayroomById = async (req, res) => {
  try {
    console.log("Dohvatam igraonicu sa ID:", req.params.id);

    const playroom = await Playroom.findById(req.params.id).populate(
      "vlasnikId",
      "ime prezime email telefon",
    );

    console.log(
      "Pronađena igraonica:",
      playroom ? playroom.naziv : "Nije pronađena",
    );
    console.log("VideoGalerija:", playroom?.videoGalerija?.length || 0);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Ako nije verifikovana, samo vlasnik i admin mogu da vide
    if (
      !playroom.verifikovan &&
      req.user?.role !== "vlasnik" &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Ova igraonica još nije verifikovana",
      });
    }

    res.status(200).json({
      success: true,
      data: playroom,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati svoje igraonice (za vlasnika)
// @route   GET /api/playrooms/mine/my-playrooms
// @access  Private (vlasnik)
exports.getMyPlayrooms = async (req, res) => {
  try {
    const playrooms = await Playroom.find({ vlasnikId: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: playrooms.length,
      data: playrooms,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Ažuriraj igraonicu
// @route   PUT /api/playrooms/:id
// @access  Private (vlasnik te igraonice ili admin)
exports.updatePlayroom = async (req, res) => {
  try {
    let playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Proveri da li korisnik ima pravo (vlasnik ili admin)
    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da menjate ovu igraonicu",
      });
    }

    // Ažuriraj igraonicu
    playroom = await Playroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Ako je promenjeno radno vreme, regeneriši termine
    if (req.body.radnoVreme) {
      console.log(
        `🔄 Radno vreme promenjeno, regenerišem termine za ${playroom.naziv}...`,
      );
      const {
        generateTimeSlotsForPlayroom,
      } = require("../utils/generateTimeSlots");
      const {
        deleteAllTimeSlotsForPlayroom,
      } = require("../utils/generateTimeSlots");

      await deleteAllTimeSlotsForPlayroom(playroom._id);
      const result = await generateTimeSlotsForPlayroom(playroom._id, 30);
      console.log(`✅ Regenerisano ${result.createdCount} termina`);
    }

    res.status(200).json({
      success: true,
      data: playroom,
      message: "Igraonica je uspešno ažurirana",
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Obriši igraonicu
// @route   DELETE /api/playrooms/:id
// @access  Private (vlasnik ili admin)
exports.deletePlayroom = async (req, res) => {
  try {
    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Proveri prava
    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da obrišete ovu igraonicu",
      });
    }

    // Obriši sve termine vezane za igraonicu
    const TimeSlot = require("../models/TimeSlot");
    await TimeSlot.deleteMany({ playroomId: playroom._id });
    console.log(`🗑 Obrisani svi termini za igraonicu ${playroom.naziv}`);

    await playroom.deleteOne();

    res.status(200).json({
      success: true,
      message: "Igraonica i svi njeni termini su obrisani",
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Verifikuj igraonicu (samo admin)
// @route   PUT /api/playrooms/:id/verify
// @access  Private (admin)
exports.verifyPlayroom = async (req, res) => {
  try {
    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    playroom.verifikovan = true;
    playroom.status = "aktivan";
    await playroom.save();

    // Generiši termine za verifikovanu igraonicu
    console.log(`🔄 Generišem termine za ${playroom.naziv}...`);
    const result = await generateTimeSlotsForPlayroom(playroom._id, 30);
    console.log(`✅ Generisano ${result.createdCount} termina`);

    res.status(200).json({
      success: true,
      data: playroom,
      message: `Igraonica je verifikovana. ${result.createdCount} termina je automatski generisano.`,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Regeneriši termine za igraonicu (ručno)
// @route   POST /api/playrooms/:id/regenerate-slots
// @access  Private (vlasnik)
exports.regenerateTimeSlots = async (req, res) => {
  try {
    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da regenerišete termine",
      });
    }

    const TimeSlot = require("../models/TimeSlot");
    await TimeSlot.deleteMany({ playroomId: playroom._id });

    const result = await generateTimeSlotsForPlayroom(playroom._id, 30);

    res.status(200).json({
      success: true,
      message: `Termini su regenerisani. Generisano ${result.createdCount} novih termina.`,
      data: result,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

const Booking = require("../models/Booking");

// @desc    Dohvati statistiku za vlasnika igraonice
// @route   GET /api/playrooms/:id/stats
// @access  Private (Vlasnik)
exports.getOwnerStats = async (req, res, next) => {
  try {
    const playroomId = req.params.id;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res
        .status(404)
        .json({ success: false, message: "Igraonica nije pronađena" });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate dozvolu za ovaj pristup",
      });
    }

    const stats = await Booking.aggregate([
      { $match: { playroomId: playroom._id } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "potvrdjeno"] }, 1, 0] },
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "zavrseno"] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ["$status", ["potvrdjeno", "zavrseno"]] },
                "$ukupnaCena",
                0,
              ],
            },
          },
        },
      },
    ]);

    const result =
      stats.length > 0
        ? stats[0]
        : {
            totalBookings: 0,
            confirmedBookings: 0,
            completedBookings: 0,
            totalRevenue: 0,
          };

    res.status(200).json({
      success: true,
      data: {
        playroomName: playroom.naziv,
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
};
