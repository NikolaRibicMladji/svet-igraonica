const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");

const timeSlotService = require("../services/timeSlotService");
const mongoose = require("mongoose");
const TimeSlot = require("../models/TimeSlot");
const bookingService = require("../services/bookingService");
const { getBlockingStatuses } = require("../services/bookingService");
const ErrorResponse = require("../utils/errorResponse");
const {
  APP_TIMEZONE,
  getNowInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
  parseDateOnlyInAppTimezone,
} = require("../utils/dateTime");

const { formatInTimeZone, fromZonedTime } = require("date-fns-tz");
const PLAYROOM_STATUS = require("../constants/playroomStatus");

const buildDateTimeInAppTimezone = (date, time) => {
  const [hour, minute] = String(time || "00:00")
    .split(":")
    .map((value) => Number(value));

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  const datePart = formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");

  return fromZonedTime(
    `${datePart}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )}:00`,
    APP_TIMEZONE,
  );
};

const ensurePublicPlayroom = (playroom) => {
  if (!playroom) {
    throw new ErrorResponse("Igraonica nije pronađena", 404);
  }

  if (!playroom.verifikovan || playroom.status !== PLAYROOM_STATUS.AKTIVAN) {
    throw new ErrorResponse("Igraonica nije javno dostupna", 403);
  }
};

// @desc    Kreiraj novi termin (samo vlasnik igraonice)
// @route   POST /api/timeslots
// @access  Private (vlasnik)
exports.createTimeSlot = async (req, res, next) => {
  try {
    const { playroomId, datum, vremeOd, vremeDo, cena } = req.validated.body;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da dodajete termine za ovu igraonicu",
        403,
      );
    }

    const slotDate = startOfDayInAppTimezone(parseDateOnlyInAppTimezone(datum));

    try {
      const timeSlot = await TimeSlot.create({
        playroomId,
        datum: slotDate,
        vremeOd,
        vremeDo,
        cena,
        zauzeto: false,
        aktivno: true,
        vanRadnogVremena: false,
      });

      return res.status(201).json({
        success: true,
        data: timeSlot,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ErrorResponse("Termin već postoji", 400);
      }

      throw err;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati sve termine za igraonicu
// @route   GET /api/timeslots/playroom/:playroomId
// @access  Public
exports.getTimeSlotsByPlayroom = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;
    const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId).lean();
    ensurePublicPlayroom(playroom);

    const startDate = startOfDayInAppTimezone(
      parseDateOnlyInAppTimezone(datum),
    );
    const endDate = endOfDayInAppTimezone(startDate);

    const now = getNowInAppTimezone();

    const timeSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
      aktivno: true,
      vanRadnogVremena: false,
    })
      .sort({ vremeOd: 1 })
      .lean();
    const isToday =
      formatInTimeZone(startDate, APP_TIMEZONE, "yyyy-MM-dd") ===
      formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");

    const filteredSlots = isToday
      ? timeSlots.filter((slot) => {
          const slotEnd = buildDateTimeInAppTimezone(slot.datum, slot.vremeDo);

          return slotEnd && slotEnd > now;
        })
      : timeSlots;

    res.status(200).json({
      success: true,
      count: filteredSlots.length,
      data: filteredSlots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati svoje termine (za vlasnika)
// @route   GET /api/timeslots/my
// @access  Private (vlasnik)
exports.getMyTimeSlots = async (req, res, next) => {
  try {
    const playrooms = await Playroom.find({ vlasnikId: req.user.id })
      .select("_id")
      .lean();
    const playroomIds = playrooms.map((p) => p._id);

    const timeSlots = await TimeSlot.find({ playroomId: { $in: playroomIds } })
      .populate("playroomId", "naziv")
      .sort({ datum: -1, vremeOd: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati jedan termin po ID
// @route   GET /api/timeslots/:id
// @access  Public
exports.getTimeSlotById = async (req, res, next) => {
  try {
    const { id } = req.validated.params;
    const timeSlot = await TimeSlot.findById(id).lean();

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId).lean();
    ensurePublicPlayroom(playroom);

    if (!timeSlot.aktivno || timeSlot.vanRadnogVremena) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    res.status(200).json({
      success: true,
      data: timeSlot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ažuriraj termin
// @route   PUT /api/timeslots/:id
// @access  Private (vlasnik ili admin)
exports.updateTimeSlot = async (req, res, next) => {
  try {
    const { id } = req.validated.params;
    const { cena, aktivno } = req.validated.body;

    let timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da menjate ovaj termin", 403);
    }

    if (cena !== undefined) {
      const parsedCena = Number(cena);

      if (!Number.isFinite(parsedCena) || parsedCena < 0) {
        throw new ErrorResponse(
          "Cena mora biti broj veći ili jednak nuli",
          400,
        );
      }

      const updated = await TimeSlot.findOneAndUpdate(
        {
          _id: timeSlot._id,
          zauzeto: false,
        },
        {
          $set: { cena: parsedCena },
        },
        { new: true, runValidators: true },
      );

      if (!updated) {
        throw new ErrorResponse(
          "Ne možeš menjati cenu termina koji ima rezervaciju",
          400,
        );
      }

      timeSlot = updated;
    }

    if (aktivno !== undefined) {
      if (aktivno === false) {
        timeSlot = await timeSlotService.deactivateSlotIfAllowed(timeSlot);
      } else {
        const slotEnd = buildDateTimeInAppTimezone(
          timeSlot.datum,
          timeSlot.vremeDo,
        );

        if (!slotEnd || slotEnd <= getNowInAppTimezone()) {
          throw new ErrorResponse(
            "Prošli termin ne može biti ponovo aktiviran",
            400,
          );
        }

        timeSlot.aktivno = true;
        await timeSlot.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: timeSlot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obriši termin
// @route   DELETE /api/timeslots/:id
// @access  Private (vlasnik ili admin)
exports.deleteTimeSlot = async (req, res, next) => {
  try {
    const { id } = req.validated.params;
    const timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da obrišete ovaj termin", 403);
    }

    await timeSlotService.deleteSlotIfAllowed(timeSlot);

    res.status(200).json({
      success: true,
      message: "Termin je obrisan",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ručno generiši termine za igraonicu
// @route   POST /api/timeslots/generate/:playroomId
// @access  Private (vlasnik)
exports.generateSlotsForPlayroom = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;

    const playroom = await Playroom.findById(playroomId).lean();

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da generišete termine za ovu igraonicu",
        403,
      );
    }

    const result = await generateTimeSlotsForPlayroom(playroomId);

    res.status(200).json({
      success: true,
      message: `Generisano ${result.createdCount || 0} novih termina`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati slobodne termine za igraonicu
// @route   GET /api/timeslots/playroom/:playroomId/available
// @access  Public
// @desc    Dohvati slobodne termine za igraonicu
// @route   GET /api/timeslots/playroom/:playroomId/available
// @access  Public
exports.getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;
    const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId).lean();
    ensurePublicPlayroom(playroom);

    const targetDate = bookingService.parseValidDate(datum);

    const workingHours = bookingService.getWorkingHoursForDate(
      playroom,
      targetDate,
    );

    if (!workingHours) {
      return res.status(200).json({
        success: true,
        data: {
          mode: playroom.rezimRezervacije,
          workingHours: null,
          slots: [],
          busySlots: [],
          busyIntervals: [],
          freeIntervals: [],
        },
      });
    }

    if (playroom.rezimRezervacije === "fiksno") {
      const startDate = startOfDayInAppTimezone(targetDate);
      const endDate = endOfDayInAppTimezone(startDate);
      const now = getNowInAppTimezone();

      const isToday =
        formatInTimeZone(startDate, APP_TIMEZONE, "yyyy-MM-dd") ===
        formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");

      const [slots, bookings] = await Promise.all([
        TimeSlot.find({
          playroomId,
          datum: { $gte: startDate, $lte: endDate },
          aktivno: true,
          vanRadnogVremena: false,
        })
          .select("_id datum vremeOd vremeDo cena zauzeto aktivno")
          .sort({ vremeOd: 1 })
          .lean(),

        bookingService.getActiveBookingsForDate({
          playroomId,
          datum: targetDate,
        }),
      ]);

      const blockedSlotIds = new Set(
        bookings
          .map((booking) => booking.timeSlotId?.toString())
          .filter(Boolean),
      );

      const blockedIntervals = new Set(
        bookings.map((booking) => `${booking.vremeOd}_${booking.vremeDo}`),
      );

      const visibleSlots = slots.filter((slot) => {
        if (!isToday) return true;

        const slotEnd = buildDateTimeInAppTimezone(slot.datum, slot.vremeDo);

        return slotEnd && slotEnd > now;
      });

      const normalizedSlots = visibleSlots.map((slot) => {
        const isBusy =
          Boolean(slot.zauzeto) ||
          blockedSlotIds.has(slot._id.toString()) ||
          blockedIntervals.has(`${slot.vremeOd}_${slot.vremeDo}`);

        return {
          _id: slot._id,
          datum: slot.datum,
          vremeOd: slot.vremeOd,
          vremeDo: slot.vremeDo,
          cena: slot.cena,
          zauzeto: isBusy,
          available: !isBusy,
        };
      });

      const availableSlots = normalizedSlots.filter((slot) => slot.available);
      const busySlots = normalizedSlots.filter((slot) => !slot.available);

      return res.status(200).json({
        success: true,
        data: {
          mode: "fiksno",
          workingHours,
          slots: availableSlots,
          busySlots,
          busyIntervals: busySlots.map((slot) => ({
            vremeOd: slot.vremeOd,
            vremeDo: slot.vremeDo,
          })),
          freeIntervals: [],
        },
      });
    }

    const bookings = await bookingService.getActiveBookingsForDate({
      playroomId,
      datum: targetDate,
    });

    const segments = bookingService.buildDaySegments({
      workingHours,
      preparationMinutes: Number(playroom.vremePripremeTermina) || 0,
      bookings: bookings.map((booking) => ({
        vremeOd: booking.vremeOd,
        vremeDo: booking.vremeDo,
      })),
    });

    const busyIntervals = segments
      .filter((segment) => segment.tip === "zauzeto")
      .map((segment) => ({
        vremeOd: segment.vremeOd,
        vremeDo: segment.vremeDo,
        originalVremeDo: segment.originalVremeDo || segment.vremeDo,
        hasPreparationBuffer: Boolean(segment.hasPreparationBuffer),
      }));

    const freeIntervals = segments
      .filter((segment) => segment.tip === "slobodno")
      .map((segment) => ({
        vremeOd: segment.vremeOd,
        vremeDo: segment.vremeDo,
      }));

    return res.status(200).json({
      success: true,
      data: {
        mode: "fleksibilno",
        workingHours,
        slots: [],
        busySlots: [],
        busyIntervals,
        freeIntervals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati sve termine za vlasnika (sa detaljima)
// @route   GET /api/timeslots/playroom/:playroomId/all
// @access  Private (vlasnik)
exports.getAllTimeSlotsForOwner = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;
    const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da vidite termine za ovu igraonicu",
        403,
      );
    }

    const targetDate = bookingService.parseValidDate(datum);

    const workingHours = bookingService.getWorkingHoursForDate(
      playroom,
      targetDate,
    );

    if (!workingHours) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        playroom: {
          id: playroom._id,
          naziv: playroom.naziv,
          grad: playroom.grad,
        },
      });
    }

    const startDate = startOfDayInAppTimezone(targetDate);
    const endDate = endOfDayInAppTimezone(startDate);

    const bookings = await Booking.find({
      playroomId,
      datum: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $in: getBlockingStatuses() },
    })
      .select(
        "_id roditeljId imeRoditelja prezimeRoditelja emailRoditelja telefonRoditelja napomena status createdAt ukupnaCena vremeOd vremeDo brojDece brojRoditelja izabraneCene izabraniPaket izabraneUsluge",
      )
      .populate("roditeljId", "ime prezime email telefon")
      .sort({ vremeOd: 1 })
      .lean();

    const segments = bookingService.buildDaySegments({
      workingHours,
      preparationMinutes: Number(playroom.vremePripremeTermina) || 0,
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        vremeOd: booking.vremeOd,
        vremeDo: booking.vremeDo,
        booking: {
          id: booking._id,
          roditelj: booking.roditeljId,
          imeRoditelja: booking.imeRoditelja,
          prezimeRoditelja: booking.prezimeRoditelja,
          emailRoditelja: booking.emailRoditelja,
          telefonRoditelja: booking.telefonRoditelja,
          ukupnaCena: booking.ukupnaCena,
          brojDece: booking.brojDece,
          brojRoditelja: booking.brojRoditelja,
          izabraneCene: booking.izabraneCene || [],
          izabraniPaket: booking.izabraniPaket || null,
          izabraneUsluge: booking.izabraneUsluge || [],
          napomena: booking.napomena,
          status: booking.status,
          createdAt: booking.createdAt,
        },
      })),
    });

    const normalizedSegments = segments.map((segment) => ({
      tip: segment.tip,
      vremeOd: segment.vremeOd,
      vremeDo: segment.vremeDo,
      originalVremeDo: segment.originalVremeDo || segment.vremeDo,
      hasPreparationBuffer: Boolean(segment.hasPreparationBuffer),
      booking: segment.booking?.booking || segment.booking || null,
    }));

    res.status(200).json({
      success: true,
      count: normalizedSegments.length,
      data: normalizedSegments,
      playroom: {
        id: playroom._id,
        naziv: playroom.naziv,
        grad: playroom.grad,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ručno zauzmi termin (vlasnik rezerviše)
// @route   POST /api/timeslots/:id/manual-book
// @access  Private (vlasnik)
exports.manualBookTimeSlot = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.validated.params;
    const {
      cenaIds,
      paketId,
      usluge,
      brojDece,
      brojRoditelja,
      imeRoditelja,
      prezimeRoditelja,
      emailRoditelja,
      telefonRoditelja,
      napomena,
    } = req.validated.body;

    const timeSlot = await TimeSlot.findById(id).session(session);

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId).session(
      session,
    );

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da zauzmete ovaj termin", 403);
    }

    const booking = await bookingService.reserveSlot({
      slotId: timeSlot._id,
      user: null,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja,
        prezimeRoditelja,
        emailRoditelja,
        telefonRoditelja,
        napomena,
      },
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: booking,
      message: `Termin je uspešno zauzet. Ukupno: ${booking.ukupnaCena} RSD`,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

exports.manualBookInterval = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      cenaIds,
      paketId,
      usluge,
      brojDece,
      brojRoditelja,
      imeRoditelja,
      prezimeRoditelja,
      emailRoditelja,
      telefonRoditelja,
      napomena,
    } = req.validated.body;

    const playroom = await Playroom.findById(playroomId).session(session);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da ručno rezervišete za ovu igraonicu",
        403,
      );
    }

    const booking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: null,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja,
        prezimeRoditelja,
        emailRoditelja,
        telefonRoditelja,
        napomena,
      },
      session,
    });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      data: booking,
      message: "Termin je uspešno ručno zauzet.",
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};
