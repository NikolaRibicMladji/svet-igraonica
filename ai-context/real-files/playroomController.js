const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const TimeSlot = require("../models/TimeSlot");
const bcrypt = require("bcryptjs");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const BOOKING_STATUS = require("../constants/bookingStatus");
const {
  createPlayroomWithSlots,
  verifyPlayroomAndGenerateSlots,
  regenerateSlotsForPlayroom,
} = require("../services/playroomService");
const User = require("../models/User");
const {
  sendPlayroomVerificationNotification,
} = require("../utils/emailService");
const { syncTimeSlotsWithWorkingHours } = require("../utils/generateTimeSlots");
const isEqual = require("lodash.isequal");
const {
  normalizeText,
  normalizeDisplayText,
} = require("../utils/normalizeText");
const normalizeRadnoVreme = (radnoVreme = {}) => {
  const days = [
    "ponedeljak",
    "utorak",
    "sreda",
    "cetvrtak",
    "petak",
    "subota",
    "nedelja",
  ];

  const normalized = {};

  for (const day of days) {
    const value = radnoVreme?.[day] ?? null;
    if (!value) {
      normalized[day] = { radi: false };
      continue;
    }
    const radi = value.radi === true;

    if (!radi) {
      normalized[day] = { radi: false };
    } else {
      normalized[day] = {
        od: value.od || "",
        do: value.do || "",
        radi: true,
      };
    }
  }

  return normalized;
};

// @desc    Kreiraj novu igraonicu (samo vlasnici)
// @route   POST /api/playrooms
// @access  Private (vlasnik ili admin)
exports.createPlayroom = async (req, res, next) => {
  try {
    const body = req.validated.body;
    body.vlasnikId = req.user.id;

    const ownerUser = await User.findById(req.user.id).select("email");

    const existingOwnerPlayroom = await Playroom.findOne({
      vlasnikId: req.user.id,
    });

    if (existingOwnerPlayroom) {
      return res.status(400).json({
        success: false,
        message: "Već imate registrovanu igraonicu.",
      });
    }

    if (!ownerUser?.email) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije pronađen ili nema email.",
      });
    }

    const normalizedNaziv = normalizeText(body.naziv?.trim());
    const normalizedGrad = normalizeText(body.grad?.trim());
    const normalizedAdresa = normalizeText(body.adresa?.trim());

    const postojiNaziv = await Playroom.findOne({
      nazivNormalized: normalizedNaziv,
      gradNormalized: normalizedGrad,
    });

    if (postojiNaziv) {
      return res.status(400).json({
        success: false,
        message: "Igraonica sa ovim nazivom već postoji u ovom gradu.",
      });
    }

    const postojiAdresa = await Playroom.findOne({
      adresaNormalized: normalizedAdresa,
      gradNormalized: normalizedGrad,
    });

    if (postojiAdresa) {
      return res.status(400).json({
        success: false,
        message: "Igraonica sa ovom adresom već postoji u ovom gradu.",
      });
    }

    const trimmedNaziv = body.naziv?.trim() || "";
    const trimmedGrad = body.grad?.trim() || "";

    const result = await createPlayroomWithSlots({
      ...body,
      naziv: trimmedNaziv,
      nazivNormalized: normalizedNaziv,
      grad: trimmedGrad,
      gradNormalized: normalizedGrad,
      adresa: body.adresa?.trim(),
      adresaNormalized: normalizedAdresa,
      kontaktEmail: ownerUser.email.trim().toLowerCase(),
    });
    const owner = await User.findById(req.user.id).select("ime prezime email");

    sendPlayroomVerificationNotification(result.playroom, owner).catch(
      (err) => {
        console.error(
          "Greška pri slanju emaila za verifikaciju igraonice:",
          err,
        );
      },
    );

    res.status(201).json({
      success: true,
      data: result.playroom,
      message: `Igraonica je kreirana. ${
        result.slotResult?.createdCount || 0
      } termina je automatski generisano.`,
      slotWarning: result.slotError || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati sve verifikovane igraonice (sa filtriranjem)
// @route   GET /api/playrooms
// @access  Public
exports.getAllPlayrooms = async (req, res, next) => {
  try {
    const { grad, minRating, sortBy, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 12, 1);
    const skip = (page - 1) * limit;

    const query = {
      verifikovan: true,
      status: PLAYROOM_STATUS.AKTIVAN,
    };

    if (grad && grad !== "svi") {
      query.gradNormalized = normalizeText(grad);
    }
    if (search && search.trim()) {
      const normalizedSearch = normalizeText(search.trim());

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { nazivNormalized: { $regex: `^${normalizedSearch}` } },
          { gradNormalized: { $regex: `^${normalizedSearch}` } },
        ],
      });
    }

    if (minRating && minRating !== "sve") {
      query.rating = { $gte: parseInt(minRating, 10) };
    }

    let sort = { createdAt: -1 };

    if (sortBy === "rating") {
      sort = { rating: -1, createdAt: -1 };
    }

    const [playrooms, total] = await Promise.all([
      Playroom.find(query).select("-__v").sort(sort).skip(skip).limit(limit),
      Playroom.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: playrooms.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: playrooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati jednu igraonicu po ID
// @route   GET /api/playrooms/:id
// @access  Public
exports.getPlayroomById = async (req, res, next) => {
  try {
    const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = playroom.vlasnikId?.toString() === req.user?.id;

    if (
      (!playroom.verifikovan || playroom.status !== PLAYROOM_STATUS.AKTIVAN) &&
      !isAdmin &&
      !isOwner
    ) {
      return res.status(403).json({
        success: false,
        message: "Ova igraonica nije javno dostupna",
      });
    }

    const data = playroom.toObject();

    // ❌ ukloni privatno
    delete data.vlasnikId;
    delete data.__v;
    delete data.createdAt;
    delete data.updatedAt;

    // ❌ ukloni email ako NE želiš javno
    // delete data.kontaktEmail;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati svoje igraonice (za vlasnika)
// @route   GET /api/playrooms/mine/my-playrooms
// @access  Private (vlasnik)
exports.getMyPlayrooms = async (req, res, next) => {
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
    next(error);
  }
};

// @desc    Ažuriraj igraonicu
// @route   PUT /api/playrooms/:id
// @access  Private (vlasnik te igraonice ili admin)
exports.updatePlayroom = async (req, res, next) => {
  try {
    const body = req.validated.body;
    let playroom = await Playroom.findById(req.params.id);

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
        message: "Nemate pravo da menjate ovu igraonicu",
      });
    }

    const oldRadnoVreme = normalizeRadnoVreme(playroom.radnoVreme);
    const hasRadnoVremeUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "radnoVreme",
    );
    const newRadnoVreme = hasRadnoVremeUpdate
      ? normalizeRadnoVreme(body.radnoVreme)
      : oldRadnoVreme;

    const oldRezimRezervacije = playroom.rezimRezervacije || "fleksibilno";
    const oldTrajanjeTermina = Number(playroom.trajanjeTermina) || 60;
    const oldVremePripremeTermina = Number(playroom.vremePripremeTermina) || 0;

    const hasRezimRezervacijeUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "rezimRezervacije",
    );

    const hasTrajanjeTerminaUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "trajanjeTermina",
    );

    const hasVremePripremeTerminaUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "vremePripremeTermina",
    );

    const newRezimRezervacije = hasRezimRezervacijeUpdate
      ? body.rezimRezervacije
      : oldRezimRezervacije;

    const newTrajanjeTermina = hasTrajanjeTerminaUpdate
      ? Number(body.trajanjeTermina)
      : oldTrajanjeTermina;

    const newVremePripremeTermina = hasVremePripremeTerminaUpdate
      ? Number(body.vremePripremeTermina)
      : oldVremePripremeTermina;

    const updateData = {
      ...body,
      ...(hasRadnoVremeUpdate ? { radnoVreme: newRadnoVreme } : {}),
      ...(body.naziv ? { naziv: body.naziv.trim() } : {}),
      ...(body.grad ? { grad: body.grad.trim() } : {}),
      ...(body.adresa ? { adresa: body.adresa.trim() } : {}),
      ...(body.kontaktEmail
        ? { kontaktEmail: body.kontaktEmail.trim().toLowerCase() }
        : {}),
    };

    if (updateData.naziv) {
      updateData.nazivNormalized = normalizeText(updateData.naziv);
    }

    if (updateData.grad) {
      updateData.gradNormalized = normalizeText(updateData.grad);
    }

    if (updateData.adresa) {
      updateData.adresaNormalized = normalizeText(updateData.adresa);
    }

    if (updateData.nazivNormalized) {
      const existingPlayroom = await Playroom.findOne({
        _id: { $ne: playroom._id },
        nazivNormalized: updateData.nazivNormalized,
        gradNormalized: updateData.gradNormalized || playroom.gradNormalized,
      });

      if (existingPlayroom) {
        return res.status(400).json({
          success: false,
          message: "Igraonica sa ovim imenom već postoji",
        });
      }
    }

    if (updateData.adresaNormalized || updateData.gradNormalized) {
      const existingAddress = await Playroom.findOne({
        _id: { $ne: playroom._id },
        adresaNormalized:
          updateData.adresaNormalized || playroom.adresaNormalized,
        gradNormalized: updateData.gradNormalized || playroom.gradNormalized,
      });

      if (existingAddress) {
        return res.status(400).json({
          success: false,
          message: "Igraonica sa ovom adresom već postoji u ovom gradu.",
        });
      }
    }

    playroom = await Playroom.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    let syncResult = null;

    const shouldSyncSlots =
      (hasRadnoVremeUpdate && !isEqual(oldRadnoVreme, newRadnoVreme)) ||
      (hasRezimRezervacijeUpdate &&
        oldRezimRezervacije !== newRezimRezervacije) ||
      (hasTrajanjeTerminaUpdate && oldTrajanjeTermina !== newTrajanjeTermina) ||
      (hasVremePripremeTerminaUpdate &&
        oldVremePripremeTermina !== newVremePripremeTermina);

    if (shouldSyncSlots) {
      syncResult = await syncTimeSlotsWithWorkingHours(playroom._id);

      if (!syncResult.success) {
        return res.status(400).json({
          success: false,
          message: syncResult.message || "Greška pri sinhronizaciji termina",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: playroom,
      message: "Igraonica je uspešno ažurirana",
      slotSync: syncResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obriši igraonicu
// @route   DELETE /api/playrooms/:id
// @access  Private (vlasnik ili admin)
exports.deletePlayroom = async (req, res, next) => {
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
        message: "Nemate pravo da obrišete ovu igraonicu",
      });
    }

    if (playroom.status !== PLAYROOM_STATUS.DEAKTIVIRAN) {
      return res.status(400).json({
        success: false,
        message: "Prvo morate deaktivirati igraonicu pre brisanja.",
      });
    }

    const activeBookings = await Booking.countDocuments({
      playroomId: playroom._id,
      status: {
        $in: [BOOKING_STATUS.CEKANJE, BOOKING_STATUS.POTVRDJENO],
      },
      datum: { $gte: new Date() },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: "Ne možeš obrisati igraonicu dok postoje aktivne rezervacije",
      });
    }

    await TimeSlot.deleteMany({ playroomId: playroom._id });
    await playroom.deleteOne();

    res.status(200).json({
      success: true,
      message: "Igraonica i svi njeni termini su obrisani",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deaktiviraj igraonicu
// @route   PUT /api/playrooms/:id/deactivate
// @access  Private (vlasnik)
exports.deactivatePlayroom = async (req, res, next) => {
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
        message: "Nemate pravo za ovu akciju",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen",
      });
    }

    const passwordMatch = await bcrypt.compare(
      req.validated.body.password,
      user.password,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Lozinka nije tačna",
      });
    }

    if (playroom.status === PLAYROOM_STATUS.DEAKTIVIRAN) {
      return res.status(400).json({
        success: false,
        message: "Igraonica je već deaktivirana.",
      });
    }

    playroom.status = PLAYROOM_STATUS.DEAKTIVIRAN;
    playroom.verifikovan = false;
    playroom.deactivatedAt = new Date();

    await playroom.save();

    // deaktiviraj buduće slobodne slotove
    await TimeSlot.updateMany(
      {
        playroomId: playroom._id,
        datum: { $gte: new Date() },
        zauzeto: false,
      },
      {
        $set: {
          aktivno: false,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Igraonica je deaktivirana i više nije javno dostupna.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verifikuj igraonicu (samo admin)
// @route   PUT /api/playrooms/:id/verify
// @access  Private (admin)
exports.verifyPlayroom = async (req, res, next) => {
  try {
    const result = await verifyPlayroomAndGenerateSlots(req.params.id);

    res.status(200).json({
      success: true,
      data: result.playroom,
      message: `Igraonica je verifikovana. ${
        result.slotResult?.createdCount || 0
      } termina je automatski generisano.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regeneriši termine za igraonicu (ručno)
// @route   POST /api/playrooms/:id/regenerate-slots
// @access  Private (vlasnik ili admin)
exports.regenerateTimeSlots = async (req, res, next) => {
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
        message: "Nemate pravo da regenerišete termine za ovu igraonicu",
      });
    }

    const result = await regenerateSlotsForPlayroom(req.params.id);

    res.status(200).json({
      success: true,
      message: `Termini su sinhronizovani. Novo: ${
        result.createdCount || 0
      }, deaktivirano: ${result.deactivatedCount || 0}, konflikti: ${
        result.conflictCount || 0
      }.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati statistiku za vlasnika igraonice
// @route   GET /api/playrooms/:id/stats
// @access  Private (Vlasnik)
exports.getOwnerStats = async (req, res, next) => {
  try {
    const playroomId = req.params.id;

    const playroom = await Playroom.findById(playroomId);
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
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.POTVRDJENO] }, 1, 0],
            },
          },
          waitingBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.CEKANJE] }, 1, 0],
            },
          },
          canceledBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.OTKAZANO] }, 1, 0],
            },
          },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.ZAVRSENO] }, 1, 0],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [BOOKING_STATUS.POTVRDJENO, BOOKING_STATUS.ZAVRSENO],
                  ],
                },
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
            waitingBookings: 0,
            canceledBookings: 0,
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
// @desc    Dohvati gradove za filter
// @route   GET /api/playrooms/filter-cities
// @access  Public
exports.getFilterCities = async (req, res, next) => {
  try {
    const defaultCities = [
      "Beograd",
      "Novi Sad",
      "Niš",
      "Kragujevac",
      "Subotica",
      "Zrenjanin",
      "Pančevo",
      "Čačak",
      "Novi Pazar",
      "Kraljevo",
      "Smederevo",
      "Leskovac",
      "Užice",
      "Valjevo",
      "Kruševac",
    ];

    const dbCities = await Playroom.distinct("grad", {
      verifikovan: true,
      status: PLAYROOM_STATUS.AKTIVAN,
      grad: { $exists: true, $ne: "" },
    });

    const cityMap = new Map();

    [...defaultCities, ...dbCities].forEach((city) => {
      const normalizedKey = normalizeText(city);

      if (!normalizedKey) return;

      if (!cityMap.has(normalizedKey)) {
        cityMap.set(normalizedKey, normalizeDisplayText(city));
      }
    });

    const uniqueCities = Array.from(cityMap.values()).sort((a, b) =>
      a.localeCompare(b, "sr", { sensitivity: "base" }),
    );

    res.status(200).json({
      success: true,
      data: uniqueCities,
    });
  } catch (error) {
    next(error);
  }
};
