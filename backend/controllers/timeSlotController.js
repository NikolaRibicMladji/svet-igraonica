const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");
const BOOKING_STATUS = require("../constants/bookingStatus");
const timeSlotService = require("../services/timeSlotService");
const mongoose = require("mongoose");

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
    slotDate.setHours(0, 0, 0, 0);

    const existing = await timeSlotService.findDuplicateSlot({
      playroomId,
      datum: slotDate,
      vremeOd,
      vremeDo,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Termin već postoji",
      });
    }

    const timeSlot = await TimeSlot.create({
      playroomId,
      datum: slotDate,
      vremeOd,
      vremeDo,
      maxDece: playroom.kapacitet?.deca || 20,
      slobodno: 1,
      zauzeto: false,
      aktivno: true,
      vanRadnogVremena: false,
      cena,
    });

    res.status(201).json({
      success: true,
      data: timeSlot,
    });
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

    const startDate = new Date(datum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(datum);
    endDate.setHours(23, 59, 59, 999);

    const timeSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
      aktivno: true,
      vanRadnogVremena: false,
    }).sort({ vremeOd: 1 });

    const now = new Date();

    const filteredSlots = timeSlots.filter((slot) => {
      const slotEnd = new Date(slot.datum);
      const [h, m] = String(slot.vremeDo || "00:00")
        .split(":")
        .map(Number);

      slotEnd.setHours(h || 0, m || 0, 0, 0);

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
        message: "Nemate pravo da menjate ovaj termin",
      });
    }

    const { maxDece, cena, aktivno } = req.body;

    if (maxDece !== undefined) {
      const parsedMaxDece = Number(maxDece);

      const hasActiveBooking = await timeSlotService.hasActiveBookingForSlot(
        timeSlot._id,
      );

      if (hasActiveBooking) {
        return res.status(400).json({
          success: false,
          message:
            "Ne možeš menjati kapacitet termina koji ima aktivnu rezervaciju",
        });
      }

      timeSlot.maxDece = parsedMaxDece;
    }

    if (cena !== undefined) {
      const parsedCena = Number(cena);

      const hasActiveBooking = await timeSlotService.hasActiveBookingForSlot(
        timeSlot._id,
      );

      if (hasActiveBooking) {
        return res.status(400).json({
          success: false,
          message: "Ne možeš menjati cenu termina koji ima aktivnu rezervaciju",
        });
      }

      timeSlot.cena = parsedCena;
    }

    if (aktivno !== undefined) {
      if (aktivno === false) {
        await timeSlotService.deactivateSlotIfAllowed(timeSlot);
      } else {
        const slotEnd = new Date(timeSlot.datum);
        const [endHour, endMinute] = String(timeSlot.vremeDo || "00:00")
          .split(":")
          .map((v) => parseInt(v, 10));

        slotEnd.setHours(endHour || 0, endMinute || 0, 0, 0);

        if (slotEnd <= new Date()) {
          return res.status(400).json({
            success: false,
            message: "Prošli termin ne može biti ponovo aktiviran",
          });
        }

        timeSlot.aktivno = true;
      }
    }

    await timeSlot.save();

    res.status(200).json({
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

    const startDate = new Date(datum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(datum);
    endDate.setHours(23, 59, 59, 999);

    const timeSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
      aktivno: true,
      vanRadnogVremena: false,
    }).sort({ vremeOd: 1 });

    const now = new Date();

    const slotsWithStatus = timeSlots
      .map((slot) => {
        const slotEnd = new Date(slot.datum);
        const [h, m] = slot.vremeDo.split(":").map(Number);
        slotEnd.setHours(h, m, 0, 0);

        const isPast = slotEnd <= now;

        return {
          ...slot.toObject(),
          isPast,
          status: isPast ? "prošao" : slot.zauzeto ? "zauzeto" : "slobodno",
        };
      })
      .filter((slot) => !slot.isPast);

    res.status(200).json({
      success: true,
      count: slotsWithStatus.length,
      data: slotsWithStatus,
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

    const startDate = new Date(datum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(datum);
    endDate.setHours(23, 59, 59, 999);

    const timeSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
    }).sort({ vremeOd: 1 });

    const bookings = await Booking.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    })
      .select(
        "_id timeSlotId roditeljId imeRoditelja prezimeRoditelja emailRoditelja telefonRoditelja brojDece brojRoditelja napomena status createdAt",
      )
      .populate("roditeljId", "ime prezime email telefon");

    const bookingMap = new Map(
      bookings.map((b) => [b.timeSlotId?.toString(), b]),
    );

    const slotsWithBookings = timeSlots.map((slot) => {
      const foundBooking = bookingMap.get(slot._id.toString());

      return {
        ...slot.toObject(),
        booking: foundBooking
          ? {
              id: foundBooking._id,
              roditelj: foundBooking.roditeljId,
              imeRoditelja: foundBooking.imeRoditelja,
              prezimeRoditelja: foundBooking.prezimeRoditelja,
              emailRoditelja: foundBooking.emailRoditelja,
              telefonRoditelja: foundBooking.telefonRoditelja,
              brojDece: foundBooking.brojDece,
              brojRoditelja: foundBooking.brojRoditelja,
              napomena: foundBooking.napomena,
              status: foundBooking.status,
              createdAt: foundBooking.createdAt,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: slotsWithBookings.length,
      data: slotsWithBookings,
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
    const { brojDece, napomena } = req.body;

    const timeSlot = await TimeSlot.findById(id).session(session);

    if (!timeSlot) {
      await session.abortTransaction();
      session.endSession();
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
      session.endSession();
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
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da zauzmete ovaj termin",
      });
    }

    const parsedBrojDece = Number(brojDece || 1);

    if (Number.isNaN(parsedBrojDece) || parsedBrojDece < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Broj dece mora biti najmanje 1",
      });
    }

    const slotEnd = new Date(timeSlot.datum);
    const [endHour, endMinute] = String(timeSlot.vremeDo || "00:00")
      .split(":")
      .map((v) => parseInt(v, 10));

    slotEnd.setHours(endHour || 0, endMinute || 0, 0, 0);

    if (slotEnd <= new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Ne možeš ručno zauzeti prošli termin",
      });
    }

    const lockedSlot = await TimeSlot.findOneAndUpdate(
      {
        _id: timeSlot._id,
        zauzeto: false,
        slobodno: { $gt: 0 },
        aktivno: true,
        vanRadnogVremena: false,
      },
      {
        $set: {
          zauzeto: true,
          slobodno: 0,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!lockedSlot) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Termin je već zauzet, neaktivan ili ne postoji",
      });
    }

    const ukupnaCena = (lockedSlot.cena || 0) * parsedBrojDece;

    const created = await Booking.create(
      [
        {
          roditeljId: req.user.id,
          timeSlotId: lockedSlot._id,
          playroomId: lockedSlot.playroomId,
          datum: lockedSlot.datum,
          vremeOd: lockedSlot.vremeOd,
          vremeDo: lockedSlot.vremeDo,
          brojDece: parsedBrojDece,
          brojRoditelja: 0,
          ukupnaCena,
          napomena:
            napomena ||
            `Ručna rezervacija od strane vlasnika ${req.user.ime} ${req.user.prezime}`,
          status: BOOKING_STATUS.POTVRDJENO,
          imeRoditelja: req.user.ime,
          prezimeRoditelja: req.user.prezime,
          emailRoditelja: req.user.email || "manual@booking.local",
          telefonRoditelja: req.user.telefon || "nije uneto",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      data: created[0],
      message: `Termin je uspešno zauzet. Ukupno: ${ukupnaCena} RSD`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
