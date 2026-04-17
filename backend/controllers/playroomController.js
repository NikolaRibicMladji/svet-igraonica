const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const TimeSlot = require("../models/TimeSlot");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const BOOKING_STATUS = require("../constants/bookingStatus");
const {
  createPlayroomWithSlots,
  verifyPlayroomAndGenerateSlots,
  regenerateSlotsForPlayroom,
} = require("../services/playroomService");
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
    const value = radnoVreme?.[day] || {};
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
    req.body.vlasnikId = req.user.id;

    const postoji = await Playroom.findOne({
      nazivNormalized: normalizeText(req.body.naziv?.trim()),
    });

    if (postoji) {
      return res.status(400).json({
        success: false,
        message: "Igraonica sa ovim imenom već postoji",
      });
    }

    const trimmedNaziv = req.body.naziv?.trim() || "";
    const trimmedGrad = req.body.grad?.trim() || "";

    const result = await createPlayroomWithSlots({
      ...req.body,
      naziv: trimmedNaziv,
      nazivNormalized: normalizeText(trimmedNaziv),
      grad: trimmedGrad,
      gradNormalized: normalizeText(trimmedGrad),
      kontaktEmail: req.body.kontaktEmail?.trim()?.toLowerCase(),
    });

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
          { nazivNormalized: { $regex: normalizedSearch, $options: "i" } },
          { gradNormalized: { $regex: normalizedSearch, $options: "i" } },
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

    if (!playroom.verifikovan && !isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Ova igraonica još nije verifikovana",
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
      req.body,
      "radnoVreme",
    );
    const newRadnoVreme = hasRadnoVremeUpdate
      ? normalizeRadnoVreme(req.body.radnoVreme)
      : oldRadnoVreme;

    const oldRezimRezervacije = playroom.rezimRezervacije || "fleksibilno";
    const oldTrajanjeTermina = Number(playroom.trajanjeTermina) || 60;
    const oldVremePripremeTermina = Number(playroom.vremePripremeTermina) || 0;

    const hasRezimRezervacijeUpdate = Object.prototype.hasOwnProperty.call(
      req.body,
      "rezimRezervacije",
    );

    const hasTrajanjeTerminaUpdate = Object.prototype.hasOwnProperty.call(
      req.body,
      "trajanjeTermina",
    );

    const hasVremePripremeTerminaUpdate = Object.prototype.hasOwnProperty.call(
      req.body,
      "vremePripremeTermina",
    );

    const newRezimRezervacije = hasRezimRezervacijeUpdate
      ? req.body.rezimRezervacije
      : oldRezimRezervacije;

    const newTrajanjeTermina = hasTrajanjeTerminaUpdate
      ? Number(req.body.trajanjeTermina)
      : oldTrajanjeTermina;

    const newVremePripremeTermina = hasVremePripremeTerminaUpdate
      ? Number(req.body.vremePripremeTermina)
      : oldVremePripremeTermina;

    const updateData = {
      ...req.body,
      ...(req.body.naziv ? { naziv: req.body.naziv.trim() } : {}),
      ...(req.body.grad ? { grad: req.body.grad.trim() } : {}),
      ...(req.body.kontaktEmail
        ? { kontaktEmail: req.body.kontaktEmail.trim().toLowerCase() }
        : {}),
    };

    if (updateData.naziv) {
      updateData.nazivNormalized = normalizeText(updateData.naziv);
    }

    if (updateData.grad) {
      updateData.gradNormalized = normalizeText(updateData.grad);
    }

    if (updateData.nazivNormalized) {
      const existingPlayroom = await Playroom.findOne({
        _id: { $ne: playroom._id },
        nazivNormalized: updateData.nazivNormalized,
      });

      if (existingPlayroom) {
        return res.status(400).json({
          success: false,
          message: "Igraonica sa ovim imenom već postoji",
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

    const activeBookings = await Booking.countDocuments({
      playroomId: playroom._id,
      status: { $ne: BOOKING_STATUS.OTKAZANO },
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
