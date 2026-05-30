const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const TimeSlot = require("../models/TimeSlot");
const bcrypt = require("bcryptjs");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const BOOKING_STATUS = require("../constants/bookingStatus");
const logger = require("../utils/logger");
const ErrorResponse = require("../utils/errorResponse");
const {
  getNowInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
  parseDateOnlyInAppTimezone,
} = require("../utils/dateTime");
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

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const MONTH_REGEX = /^\d{4}-\d{2}$/;

const getMonthRange = (month) => {
  const safeMonth = String(month || "").trim();

  if (!MONTH_REGEX.test(safeMonth)) {
    throw new ErrorResponse("Mesec mora biti u formatu YYYY-MM.", 422);
  }

  const [year, monthNumber] = safeMonth.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new ErrorResponse("Mesec nije validan.", 422);
  }

  const lastDay = new Date(year, monthNumber, 0).getDate();

  const startDate = startOfDayInAppTimezone(
    parseDateOnlyInAppTimezone(`${safeMonth}-01`),
  );

  const endDate = endOfDayInAppTimezone(
    parseDateOnlyInAppTimezone(
      `${safeMonth}-${String(lastDay).padStart(2, "0")}`,
    ),
  );

  return {
    month: safeMonth,
    startDate,
    endDate,
  };
};

const toUsageStat = (entry) => {
  if (!entry) return null;

  return {
    name: entry._id,
    count: entry.count,
  };
};

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
      throw new ErrorResponse("Već imate registrovanu igraonicu.", 400);
    }

    if (!ownerUser?.email) {
      throw new ErrorResponse("Korisnik nije pronađen ili nema email.", 401);
    }

    const normalizedNaziv = normalizeText(body.naziv?.trim());
    const normalizedGrad = normalizeText(body.grad?.trim());
    const normalizedAdresa = normalizeText(body.adresa?.trim());

    const postojiNaziv = await Playroom.findOne({
      nazivNormalized: normalizedNaziv,
      gradNormalized: normalizedGrad,
    });

    if (postojiNaziv) {
      throw new ErrorResponse(
        "Igraonica sa ovim nazivom već postoji u ovom gradu.",
        400,
      );
    }

    const postojiAdresa = await Playroom.findOne({
      adresaNormalized: normalizedAdresa,
      gradNormalized: normalizedGrad,
    });

    if (postojiAdresa) {
      throw new ErrorResponse(
        "Igraonica sa ovom adresom već postoji u ovom gradu.",
        400,
      );
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
        logger.error(
          `Greška pri slanju emaila za verifikaciju igraonice: ${err.message}`,
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
    const {
      grad,
      minRating,
      sortBy,
      search,
      page = 1,
      limit = 12,
    } = req.validated.query;

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const query = {
      verifikovan: true,
      status: PLAYROOM_STATUS.AKTIVAN,
    };

    if (grad && grad !== "svi") {
      query.gradNormalized = normalizeText(grad);
    }
    if (search && search.trim()) {
      const normalizedSearch = normalizeText(search.trim());
      const escapedSearch = escapeRegex(normalizedSearch);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { nazivNormalized: { $regex: `^${escapedSearch}` } },
          { gradNormalized: { $regex: `^${escapedSearch}` } },
        ],
      });
    }

    if (minRating && minRating !== "sve") {
      query.rating = { $gte: Number(minRating) };
    }

    let sort = { createdAt: -1 };

    if (sortBy === "rating") {
      sort = { rating: -1, createdAt: -1 };
    }

    const [playrooms, total] = await Promise.all([
      Playroom.find(query)
        .select(
          "naziv adresa grad opis kontaktTelefon kontaktEmail radnoVreme rezimRezervacije trajanjeTermina vremePripremeTermina kapacitet cene paketi dodatneUsluge besplatnePogodnosti profilnaSlika slike videoGalerija rating reviewCount",
        )
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Playroom.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: playrooms.length,
      total,
      page,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
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
    const { id } = req.validated.params;
    const playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (!playroom.verifikovan || playroom.status !== PLAYROOM_STATUS.AKTIVAN) {
      throw new ErrorResponse("Ova igraonica nije javno dostupna", 403);
    }

    const data = playroom.toObject();

    // ❌ ukloni privatno
    delete data.vlasnikId;
    delete data.__v;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.nazivNormalized;
    delete data.gradNormalized;
    delete data.adresaNormalized;

    delete data.razlogOdbijanja;
    delete data.odbijenAt;
    delete data.deactivatedAt;

    // ❌ ukloni email ako NE želiš javno
    // delete data.kontaktEmail;

    return res.status(200).json({
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
    const playrooms = await Playroom.find({ vlasnikId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
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
    const { id } = req.validated.params;
    let playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da menjate ovu igraonicu", 403);
    }

    const oldRadnoVreme = normalizeRadnoVreme(playroom.radnoVreme);
    const hasRadnoVremeUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "radnoVreme",
    );
    const newRadnoVreme = hasRadnoVremeUpdate
      ? normalizeRadnoVreme({
          ...oldRadnoVreme,
          ...body.radnoVreme,
        })
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
      naziv: body.naziv,
      adresa: body.adresa,
      grad: body.grad,
      opis: body.opis,
      kontaktTelefon: body.kontaktTelefon,
      kontaktEmail: body.kontaktEmail,
      radnoVreme: hasRadnoVremeUpdate ? newRadnoVreme : undefined,
      rezimRezervacije: body.rezimRezervacije,
      trajanjeTermina: body.trajanjeTermina,
      vremePripremeTermina: body.vremePripremeTermina,
      kapacitet: body.kapacitet,
      cene: body.cene,
      paketi: body.paketi,
      dodatneUsluge: body.dodatneUsluge,
      besplatnePogodnosti: body.besplatnePogodnosti,
      drustveneMreze: body.drustveneMreze,
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

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
        throw new ErrorResponse("Igraonica sa ovim imenom već postoji", 400);
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
        throw new ErrorResponse(
          "Igraonica sa ovom adresom već postoji u ovom gradu.",
          400,
        );
      }
    }

    playroom = await Playroom.findByIdAndUpdate(id, updateData, {
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
        logger.error(
          "Greška pri sinhronizaciji termina nakon update-a igraonice:",
          {
            playroomId: playroom._id,
            message: syncResult.message,
          },
        );

        syncResult = {
          ...syncResult,
          warning:
            syncResult.message ||
            "Igraonica je ažurirana, ali termini nisu sinhronizovani.",
        };
      }
    }

    return res.status(200).json({
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
    const { id } = req.validated.params;
    const playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da obrišete ovu igraonicu", 403);
    }

    if (playroom.status !== PLAYROOM_STATUS.DEAKTIVIRAN) {
      throw new ErrorResponse(
        "Prvo morate deaktivirati igraonicu pre brisanja.",
        400,
      );
    }

    const now = getNowInAppTimezone();
    const startOfToday = startOfDayInAppTimezone(now);

    const activeBookings = await Booking.countDocuments({
      playroomId: playroom._id,
      status: {
        $in: [BOOKING_STATUS.CEKANJE, BOOKING_STATUS.POTVRDJENO],
      },
      datum: { $gte: startOfToday },
    });

    if (activeBookings > 0) {
      throw new ErrorResponse(
        "Ne možeš obrisati igraonicu dok postoje aktivne rezervacije",
        400,
      );
    }

    await TimeSlot.deleteMany({ playroomId: playroom._id });
    await playroom.deleteOne();

    return res.status(200).json({
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
    const { id } = req.validated.params;
    const playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo za ovu akciju", 403);
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      throw new ErrorResponse("Korisnik nije pronađen", 404);
    }

    const passwordMatch = await bcrypt.compare(
      req.validated.body.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new ErrorResponse("Lozinka nije tačna", 401);
    }

    if (playroom.status === PLAYROOM_STATUS.DEAKTIVIRAN) {
      throw new ErrorResponse("Igraonica je već deaktivirana.", 400);
    }

    const now = getNowInAppTimezone();
    const startOfToday = startOfDayInAppTimezone(now);

    const activeBookings = await Booking.countDocuments({
      playroomId: playroom._id,
      status: {
        $in: [BOOKING_STATUS.CEKANJE, BOOKING_STATUS.POTVRDJENO],
      },
      datum: { $gte: startOfToday },
    });

    if (activeBookings > 0) {
      throw new ErrorResponse(
        "Ne možete deaktivirati igraonicu dok postoje aktivne buduće rezervacije.",
        400,
      );
    }

    playroom.status = PLAYROOM_STATUS.DEAKTIVIRAN;
    playroom.verifikovan = false;
    playroom.deactivatedAt = getNowInAppTimezone();

    await playroom.save();

    await TimeSlot.updateMany(
      {
        playroomId: playroom._id,
        datum: { $gte: startOfToday },
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
    const { id } = req.validated.params;

    const result = await verifyPlayroomAndGenerateSlots(id);

    const slotSync = await syncTimeSlotsWithWorkingHours(id);

    if (!slotSync.success) {
      logger.error(
        "Greška pri sinhronizaciji termina nakon verifikacije igraonice:",
        {
          playroomId: id,
          message: slotSync.message,
        },
      );
    }

    const updatedPlayroom = await Playroom.findByIdAndUpdate(
      id,
      {
        $set: {
          deactivatedAt: null,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    const createdCount =
      (result.slotResult?.createdCount || 0) + (slotSync.createdCount || 0);

    const slotSyncPayload = slotSync.success
      ? slotSync
      : {
          ...slotSync,
          warning:
            slotSync.message ||
            "Igraonica je verifikovana, ali termini nisu sinhronizovani.",
        };

    return res.status(200).json({
      success: true,
      data: updatedPlayroom || result.playroom,
      message: `Igraonica je verifikovana. Novo: ${createdCount}, reaktivirano: ${
        slotSync.reactivatedCount || 0
      }, deaktivirano: ${slotSync.deactivatedCount || 0}, konflikti: ${
        slotSync.conflictCount || 0
      }.`,
      slotSync: slotSyncPayload,
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
    const { id } = req.validated.params;
    const playroom = await Playroom.findById(id);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da regenerišete termine za ovu igraonicu",
        403,
      );
    }

    const result = await regenerateSlotsForPlayroom(id);

    return res.status(200).json({
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
    const { id: playroomId } = req.validated.params;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate dozvolu za ovaj pristup", 403);
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

    return res.status(200).json({
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

// @desc    Mesečna analitika za vlasnika/admina
// @route   GET /api/playrooms/:id/monthly-analytics?month=YYYY-MM
// @access  Private (vlasnik ili admin)
exports.getOwnerMonthlyAnalytics = async (req, res, next) => {
  try {
    const { id: playroomId } = req.validated.params;
    const { month } = req.query;

    const playroom = await Playroom.findById(playroomId).select(
      "_id naziv vlasnikId rezimRezervacije",
    );

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate dozvolu za ovaj pristup", 403);
    }

    const { startDate, endDate, month: safeMonth } = getMonthRange(month);

    const bookingBaseMatch = {
      playroomId: playroom._id,
      datum: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    const activeBookingMatch = {
      ...bookingBaseMatch,
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    };

    const [
      totalSlots,
      occupiedBookings,
      canceledBookings,
      timeStats,
      packageStats,
      serviceStats,
    ] = await Promise.all([
      TimeSlot.countDocuments({
        playroomId: playroom._id,
        datum: { $gte: startDate, $lte: endDate },
        aktivno: true,
        vanRadnogVremena: false,
      }),

      Booking.countDocuments(activeBookingMatch),

      Booking.countDocuments({
        ...bookingBaseMatch,
        status: BOOKING_STATUS.OTKAZANO,
      }),

      Booking.aggregate([
        { $match: activeBookingMatch },
        {
          $group: {
            _id: {
              $concat: ["$vremeOd", "-", "$vremeDo"],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ]),

      Booking.aggregate([
        {
          $match: {
            ...activeBookingMatch,
            "izabraniPaket.naziv": { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$izabraniPaket.naziv",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ]),

      Booking.aggregate([
        { $match: activeBookingMatch },
        { $unwind: "$izabraneUsluge" },
        {
          $match: {
            "izabraneUsluge.naziv": { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$izabraneUsluge.naziv",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

    const mostPopularTime = timeStats[0]?._id || null;
    const leastPopularTime =
      timeStats.length > 1 ? timeStats[timeStats.length - 1]._id : null;

    const mostUsedPackage = toUsageStat(packageStats[0]);
    const leastUsedPackage =
      packageStats.length > 1
        ? toUsageStat(packageStats[packageStats.length - 1])
        : null;

    const mostUsedService = toUsageStat(serviceStats[0]);
    const leastUsedService =
      serviceStats.length > 1
        ? toUsageStat(serviceStats[serviceStats.length - 1])
        : null;

    return res.status(200).json({
      success: true,
      data: {
        playroomId: playroom._id,
        playroomName: playroom.naziv,
        month: safeMonth,
        occupancy: {
          occupied: occupiedBookings,
          total: totalSlots,
          label: `${occupiedBookings}/${totalSlots}`,
        },
        cancellations: canceledBookings,
        mostPopularTime,
        leastPopularTime,
        mostUsedPackage,
        leastUsedPackage,
        mostUsedService,
        leastUsedService,
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

    return res.status(200).json({
      success: true,
      data: uniqueCities,
    });
  } catch (error) {
    next(error);
  }
};
