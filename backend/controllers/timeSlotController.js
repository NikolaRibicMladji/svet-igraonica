const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");
const BOOKING_STATUS = require("../constants/bookingStatus");
const timeSlotService = require("../services/timeSlotService");
const mongoose = require("mongoose");
const TimeSlot = require("../models/TimeSlot");
const bookingService = require("../services/bookingService");
const { enqueueBookingEmail } = require("../services/emailQueueService");

// @desc    Kreiraj novi termin (samo vlasnik igraonice)
// @route   POST /api/timeslots
// @access  Private (vlasnik)
exports.createTimeSlot = async (req, res, next) => {
  try {
    const { playroomId, datum, vremeOd, vremeDo, cena } = req.body;

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
        message: "Nemate pravo da dodajete termine za ovu igraonicu",
      });
    }

    const slotDate = new Date(datum);
    if (isNaN(slotDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Datum nije validan",
      });
    }
    slotDate.setHours(0, 0, 0, 0);

    try {
      const timeSlot = await TimeSlot.create({
        playroomId,
        datum: slotDate,
        vremeOd,
        vremeDo,
        cena: Number(cena) || 0,
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
        return res.status(400).json({
          success: false,
          message: "Termin već postoji",
        });
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
    const { playroomId } = req.params;
    const { datum } = req.query;

    if (!datum) {
      return res.status(400).json({
        success: false,
        message: "Datum je obavezan",
      });
    }

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    const startDate = parseValidDate(datum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const timeSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
      aktivno: true,
      vanRadnogVremena: false,
    }).sort({ vremeOd: 1 });

    const now = new Date();

    const filteredSlots = timeSlots.filter((slot) => {
      const slotEnd = new Date(
        new Date(slot.datum).getFullYear(),
        new Date(slot.datum).getMonth(),
        new Date(slot.datum).getDate(),
        ...String(slot.vremeDo || "00:00")
          .split(":")
          .map((v) => parseInt(v, 10)),
      );

      return slotEnd > now;
    });

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
      .sort({ datum: -1, vremeOd: 1 });

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
    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Termin nije pronađen",
      });
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
    let timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Termin nije pronađen",
      });
    }

    const playroom = await Playroom.findById(timeSlot.playroomId);

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da menjate ovaj termin",
      });
    }

    const { cena, aktivno } = req.body;

    if (cena !== undefined) {
      const parsedCena = Number(cena);

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
        return res.status(400).json({
          success: false,
          message: "Ne možeš menjati cenu termina koji ima rezervaciju",
        });
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

        if (slotEnd <= getNowInAppTimezone()) {
          return res.status(400).json({
            success: false,
            message: "Prošli termin ne može biti ponovo aktiviran",
          });
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
    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Termin nije pronađen",
      });
    }

    const playroom = await Playroom.findById(timeSlot.playroomId);

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da obrišete ovaj termin",
      });
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
    const { playroomId } = req.params;

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
        message: "Nemate pravo da generišete termine za ovu igraonicu",
      });
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
    const { playroomId } = req.params;
    const { datum } = req.query;

    if (!datum) {
      return res.status(400).json({
        success: false,
        message: "Datum je obavezan",
      });
    }

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
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
    const { playroomId } = req.params;
    const { datum } = req.query;

    if (!datum) {
      return res.status(400).json({
        success: false,
        message: "Datum je obavezan",
      });
    }

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
        message: "Nemate pravo da vidite termine za ovu igraonicu",
      });
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

    const startDate = bookingService.parseValidDate(datum);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      playroomId,
      datum: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    })
      .select(
        "_id roditeljId imeRoditelja prezimeRoditelja emailRoditelja telefonRoditelja napomena status createdAt ukupnaCena vremeOd vremeDo",
      )
      .populate("roditeljId", "ime prezime email telefon")
      .sort({ vremeOd: 1 });

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

    const { id } = req.params;
    const {
      cenaIds,
      imeRoditelja,
      prezimeRoditelja,
      emailRoditelja,
      telefonRoditelja,
      napomena,
    } = req.body;

    const timeSlot = await TimeSlot.findById(id).session(session);

    if (!timeSlot) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Termin nije pronađen",
      });
    }

    const playroom = await Playroom.findById(timeSlot.playroomId).session(
      session,
    );

    if (!playroom) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da zauzmete ovaj termin",
      });
    }

    const booking = await bookingService.reserveSlot({
      slotId: timeSlot._id,
      user: null,
      payload: {
        cenaIds: Array.isArray(cenaIds) ? cenaIds : [],
        paketId: null,
        usluge: [],
        brojDece: 1,
        brojRoditelja: 0,
        imeRoditelja: imeRoditelja || "",
        prezimeRoditelja: prezimeRoditelja || "",
        emailRoditelja: emailRoditelja || "",
        telefonRoditelja: telefonRoditelja || "",
        napomena: napomena || "",
      },
      session,
    });

    await session.commitTransaction();

    await enqueueBookingEmail(booking._id);

    return res.status(200).json({
      success: true,
      data: booking,
      message: `Termin je uspešno zauzet. Ukupno: ${booking.ukupnaCena} RSD`,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

exports.manualBookInterval = async (req, res, next) => {
  try {
    const {
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      imeRoditelja,
      prezimeRoditelja,
      emailRoditelja,
      telefonRoditelja,
      napomena,
    } = req.body;

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
        message: "Nemate pravo da ručno rezervišete za ovu igraonicu",
      });
    }

    const defaultCena =
      Array.isArray(playroom.cene) && playroom.cene.length > 0
        ? playroom.cene[0]
        : null;

    if (!defaultCena?._id) {
      return res.status(400).json({
        success: false,
        message: "Igraonica nema nijednu cenu za obračun rezervacije",
      });
    }

    const booking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: null,
      payload: {
        cenaIds: [String(defaultCena._id)],
        paketId: null,
        usluge: [],
        brojDece: 1,
        imeRoditelja: imeRoditelja || "",
        prezimeRoditelja: prezimeRoditelja || "",
        emailRoditelja: emailRoditelja || "",
        telefonRoditelja: telefonRoditelja || "",
        napomena: napomena || "",
      },
    });

    await enqueueBookingEmail(booking._id);

    return res.status(201).json({
      success: true,
      data: booking,
      message: "Termin je uspešno ručno zauzet.",
    });
  } catch (error) {
    next(error);
  }
};
