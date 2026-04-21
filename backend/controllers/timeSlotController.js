const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");
const BOOKING_STATUS = require("../constants/bookingStatus");
const timeSlotService = require("../services/timeSlotService");
const mongoose = require("mongoose");
const TimeSlot = require("../models/TimeSlot");
const bookingService = require("../services/bookingService");
const { getBlockingStatuses } = require("../services/bookingService");
const ErrorResponse = require("../utils/errorResponse");
const { getNowInAppTimezone } = require("../utils/dateTime");

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

    const slotDate = new Date(datum);
    slotDate.setHours(0, 0, 0, 0);

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

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    const startDate = bookingService.parseValidDate(datum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

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
      startDate.getFullYear() === now.getFullYear() &&
      startDate.getMonth() === now.getMonth() &&
      startDate.getDate() === now.getDate();

    const filteredSlots = isToday
      ? timeSlots.filter((slot) => {
          const slotEnd = new Date(
            new Date(slot.datum).getFullYear(),
            new Date(slot.datum).getMonth(),
            new Date(slot.datum).getDate(),
            ...String(slot.vremeDo || "00:00")
              .split(":")
              .map((v) => parseInt(v, 10)),
          );

          return slotEnd > now;
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
    const playrooms = await Playroom.find({ vlasnikId: req.user.id });
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
        { new: true },
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
        const slotEnd = new Date(
          new Date(timeSlot.datum).getFullYear(),
          new Date(timeSlot.datum).getMonth(),
          new Date(timeSlot.datum).getDate(),
          ...String(timeSlot.vremeDo || "00:00")
            .split(":")
            .map((v) => parseInt(v, 10)),
        );

        if (slotEnd <= new Date()) {
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

    const playroom = await Playroom.findById(playroomId);
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
exports.getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;
    const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    const targetDate = bookingService.parseValidDate(datum);

    const workingHours = bookingService.getWorkingHoursForDate(
      playroom,
      targetDate,
    );

    if (!workingHours) {
      return res.status(200).json({
        success: true,
        data: {
          workingHours: null,
          busyIntervals: [],
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
      bookings: bookings.map((b) => ({
        vremeOd: b.vremeOd,
        vremeDo: b.vremeDo,
      })),
    });

    const busyIntervals = segments
      .filter((s) => s.tip === "zauzeto")
      .map((s) => ({
        vremeOd: s.vremeOd,
        vremeDo: s.vremeDo,
      }));

    const freeIntervals = segments
      .filter((s) => s.tip === "slobodno")
      .map((s) => ({
        vremeOd: s.vremeOd,
        vremeDo: s.vremeDo,
      }));

    res.status(200).json({
      success: true,
      data: {
        workingHours,
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

    const startDate = targetDate;
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      playroomId,
      datum: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $in: getBlockingStatuses() },
    })
      .select(
        "_id roditeljId imeRoditelja prezimeRoditelja emailRoditelja telefonRoditelja napomena status createdAt ukupnaCena vremeOd vremeDo",
      )
      .populate("roditeljId", "ime prezime email telefon")
      .sort({ vremeOd: 1 })
      .lean();

    const segments = bookingService.buildDaySegments({
      workingHours,
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
