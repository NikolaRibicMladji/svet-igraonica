const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");
const BOOKING_STATUS = require("../constants/bookingStatus");

// @desc    Kreiraj novi termin (samo vlasnik igraonice)
// @route   POST /api/timeslots
// @access  Private (vlasnik)
exports.createTimeSlot = async (req, res, next) => {
  try {
    const { playroomId, datum, vremeOd, vremeDo, cena } = req.body;

    if (!playroomId || !datum || !vremeOd || !vremeDo || cena == null) {
      return res.status(400).json({
        success: false,
        message: "Sva obavezna polja moraju biti popunjena",
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
        message: "Nemate pravo da dodajete termine za ovu igraonicu",
      });
    }

    const slotDate = new Date(datum);
    slotDate.setHours(0, 0, 0, 0);

    const existing = await TimeSlot.findOne({
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
      slobodno: playroom.kapacitet?.deca || 20,
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

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots,
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

      if (Number.isNaN(parsedMaxDece) || parsedMaxDece < 0) {
        return res.status(400).json({
          success: false,
          message: "maxDece mora biti validan broj",
        });
      }

      const rezervisano = Math.max(0, timeSlot.maxDece - timeSlot.slobodno);

      if (parsedMaxDece < rezervisano) {
        return res.status(400).json({
          success: false,
          message:
            "Novi kapacitet ne može biti manji od već rezervisanog broja mesta",
        });
      }

      timeSlot.maxDece = parsedMaxDece;
      timeSlot.slobodno = Math.max(0, parsedMaxDece - rezervisano);
      timeSlot.zauzeto = timeSlot.slobodno === 0;
    }

    if (cena !== undefined) {
      const parsedCena = Number(cena);

      if (Number.isNaN(parsedCena) || parsedCena < 0) {
        return res.status(400).json({
          success: false,
          message: "Cena mora biti validan broj",
        });
      }

      timeSlot.cena = parsedCena;
    }

    if (aktivno !== undefined) {
      const existingBooking = await Booking.findOne({
        timeSlotId: timeSlot._id,
        status: { $ne: BOOKING_STATUS.OTKAZANO },
      });

      if (existingBooking && aktivno === false) {
        return res.status(400).json({
          success: false,
          message: "Ne možeš deaktivirati termin koji ima rezervaciju",
        });
      }

      timeSlot.aktivno = aktivno;
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

    const existingBooking = await Booking.findOne({
      timeSlotId: timeSlot._id,
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Ne možeš obrisati termin koji ima rezervaciju",
      });
    }

    await timeSlot.deleteOne();

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

    const slotsWithStatus = timeSlots.map((slot) => ({
      ...slot.toObject(),
      status: slot.zauzeto ? "zauzeto" : "slobodno",
    }));

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
    }).populate("roditeljId", "ime prezime email telefon");

    const slotsWithBookings = timeSlots.map((slot) => {
      const foundBooking = bookings.find(
        (b) => b.timeSlotId?.toString() === slot._id.toString(),
      );

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
  try {
    const { id } = req.params;
    const { brojDece, napomena } = req.body;

    const timeSlot = await TimeSlot.findById(id);
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
        message: "Nemate pravo da zauzmete ovaj termin",
      });
    }

    const existingBooking = await Booking.findOne({
      timeSlotId: timeSlot._id,
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Termin već ima rezervaciju",
      });
    }

    if (timeSlot.zauzeto) {
      return res.status(400).json({
        success: false,
        message: "Termin je već zauzet",
      });
    }

    const parsedBrojDece = Number(brojDece || 1);

    if (Number.isNaN(parsedBrojDece) || parsedBrojDece < 1) {
      return res.status(400).json({
        success: false,
        message: "Broj dece mora biti validan broj",
      });
    }

    const ukupnaCena = timeSlot.cena * parsedBrojDece;

    const booking = await Booking.create({
      roditeljId: req.user.id,
      timeSlotId: timeSlot._id,
      playroomId: timeSlot.playroomId,
      datum: timeSlot.datum,
      vremeOd: timeSlot.vremeOd,
      vremeDo: timeSlot.vremeDo,
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
    });

    timeSlot.zauzeto = true;
    timeSlot.slobodno = 0;
    await timeSlot.save();

    res.status(200).json({
      success: true,
      data: booking,
      message: `Termin je uspešno zauzet. Ukupno: ${ukupnaCena} RSD`,
    });
  } catch (error) {
    next(error);
  }
};
