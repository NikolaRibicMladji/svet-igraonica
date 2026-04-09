const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");
const BOOKING_STATUS = require("../constants/bookingStatus");
const timeSlotService = require("../services/timeSlotService");
const mongoose = require("mongoose");
const TimeSlot = require("../models/TimeSlot");

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

        if (slotEnd <= new Date()) {
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
        const slotEnd = new Date(
          new Date(slot.datum).getFullYear(),
          new Date(slot.datum).getMonth(),
          new Date(slot.datum).getDate(),
          ...slot.vremeDo.split(":").map((v) => parseInt(v, 10)),
        );

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
        "_id timeSlotId roditeljId imeRoditelja prezimeRoditelja emailRoditelja telefonRoditelja napomena status createdAt ukupnaCena",
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
              ukupnaCena: foundBooking.ukupnaCena,
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
    const {
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

    const slotEnd = new Date(
      new Date(timeSlot.datum).getFullYear(),
      new Date(timeSlot.datum).getMonth(),
      new Date(timeSlot.datum).getDate(),
      ...String(timeSlot.vremeDo || "00:00")
        .split(":")
        .map((v) => parseInt(v, 10)),
    );

    if (slotEnd <= new Date()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Ne možeš ručno zauzeti prošli termin",
      });
    }

    const lockedSlot = await TimeSlot.findOneAndUpdate(
      {
        _id: timeSlot._id,
        zauzeto: false,
        aktivno: true,
        vanRadnogVremena: false,
      },
      {
        $set: {
          zauzeto: true,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!lockedSlot) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Termin je već zauzet, neaktivan ili ne postoji",
      });
    }

    const ukupnaCena = Number(lockedSlot.cena) || 0;

    let created;

    try {
      created = await Booking.create(
        [
          {
            roditeljId: null,
            timeSlotId: lockedSlot._id,
            playroomId: lockedSlot.playroomId,
            datum: lockedSlot.datum,
            vremeOd: lockedSlot.vremeOd,
            vremeDo: lockedSlot.vremeDo,
            ukupnaCena,
            napomena: napomena || "",
            status: BOOKING_STATUS.POTVRDJENO,
            imeRoditelja: imeRoditelja.trim(),
            prezimeRoditelja: prezimeRoditelja.trim(),
            emailRoditelja: emailRoditelja.trim().toLowerCase(),
            telefonRoditelja: telefonRoditelja.trim(),
          },
        ],
        { session },
      );
    } catch (err) {
      if (err.code === 11000) {
        await TimeSlot.findOneAndUpdate(
          {
            _id: lockedSlot._id,
            zauzeto: true,
          },
          {
            $set: { zauzeto: false },
          },
          { session },
        );

        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Termin je upravo zauzet",
        });
      }

      throw err;
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: created[0],
      message: `Termin je uspešno zauzet. Ukupno: ${ukupnaCena} RSD`,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
