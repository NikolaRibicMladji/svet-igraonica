const Booking = require("../models/Booking");
const Playroom = require("../models/Playroom");
const {
  parseDateOnlyInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
} = require("../utils/dateTime");
const bookingService = require("../services/bookingService");
const authService = require("../services/authService");
const mongoose = require("mongoose");

// @desc    Kreiraj novu rezervaciju (ulogovan korisnik)
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
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

    const booking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: req.user || null,
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
    });

    return res.status(201).json({
      success: true,
      data: booking,
      message: "Rezervacija uspešno kreirana",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Guest rezervacija + registracija + auto login
// @route   POST /api/bookings/guest
// @access  Public
exports.createGuestBooking = async (req, res, next) => {
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
      ime,
      prezime,
      email,
      telefon,
      password,
      napomena,
      acceptedTerms,
    } = req.validated.body;

    const authResult = await authService.registerGuestParent(
      {
        ime,
        prezime,
        email,
        password,
        telefon,
        acceptedTerms,
      },
      session,
    );

    const createdUser = authResult.user;
    const accessToken = authResult.accessToken;
    const refreshToken = authResult.refreshToken;

    const createdBooking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: createdUser,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja: createdUser.ime,
        prezimeRoditelja: createdUser.prezime,
        emailRoditelja: createdUser.email,
        telefonRoditelja: createdUser.telefon,
        napomena,
      },
      session,
    });

    await session.commitTransaction();

    setImmediate(() => {
      bookingService.handleBookingEmails(createdBooking._id);
    });

    res.cookie("refreshToken", refreshToken, authService.cookieOptions);

    return res.status(201).json({
      success: true,
      message: "Uspešna registracija i rezervacija",
      accessToken,
      user: {
        id: createdUser._id,
        ime: createdUser.ime,
        prezime: createdUser.prezime,
        email: createdUser.email,
        telefon: createdUser.telefon,
        role: createdUser.role,
      },
      data: createdBooking,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Dohvati moje rezervacije (roditelj)
// @route   GET /api/bookings/my
// @access  Private (roditelj)
exports.getMyBookings = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const { status, datumOd, datumDo } = req.query;

    const filter = {
      roditeljId: req.user.id,
    };

    if (status) {
      filter.status = status;
    }

    if (datumOd || datumDo) {
      filter.datum = {};

      if (datumOd) {
        filter.datum.$gte = startOfDayInAppTimezone(
          parseDateOnlyInAppTimezone(datumOd),
        );
      }

      if (datumDo) {
        filter.datum.$lte = endOfDayInAppTimezone(
          parseDateOnlyInAppTimezone(datumDo),
        );
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("playroomId", "naziv adresa grad slike")
        .populate("timeSlotId", "datum vremeOd vremeDo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati rezervacije za moje igraonice (vlasnik)
// @route   GET /api/bookings/owner
// @access  Private (vlasnik)
exports.getOwnerBookings = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const { status, datumOd, datumDo, playroomId } = req.query;

    const playrooms = await Playroom.find({ vlasnikId: req.user.id })
      .select("_id")
      .lean();

    const ownerPlayroomIds = playrooms.map((p) => p._id);

    if (ownerPlayroomIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
        data: [],
      });
    }

    let allowedPlayroomIds = ownerPlayroomIds;

    if (playroomId) {
      if (!mongoose.Types.ObjectId.isValid(playroomId)) {
        return res.status(400).json({
          success: false,
          message: "Nevalidan ID igraonice",
        });
      }

      const ownsPlayroom = ownerPlayroomIds.some(
        (id) => id.toString() === playroomId,
      );

      if (!ownsPlayroom) {
        return res.status(403).json({
          success: false,
          message: "Nemate pristup ovoj igraonici",
        });
      }

      allowedPlayroomIds = [playroomId];
    }

    const filter = {
      playroomId: { $in: allowedPlayroomIds },
    };

    if (status) {
      filter.status = status;
    }

    if (datumOd || datumDo) {
      filter.datum = {};

      if (datumOd) {
        filter.datum.$gte = startOfDayInAppTimezone(
          parseDateOnlyInAppTimezone(datumOd),
        );
      }

      if (datumDo) {
        filter.datum.$lte = endOfDayInAppTimezone(
          parseDateOnlyInAppTimezone(datumDo),
        );
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("roditeljId", "ime prezime email telefon")
        .populate("playroomId", "naziv adresa grad")
        .populate("timeSlotId", "datum vremeOd vremeDo")
        .sort({ datum: -1, vremeOd: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Otkaži rezervaciju
// @route   PUT /api/bookings/:id/cancel
// @access  Private (roditelj ili vlasnik ili admin)
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.validated.params;

    const canceledBooking = await bookingService.cancelBookingById({
      bookingId: id,
      currentUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Rezervacija je otkazana",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati jednu rezervaciju po ID
// @route   GET /api/bookings/:id
// @access  Private (roditelj ili vlasnik ili admin)
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.validated.params;

    const booking = await Booking.findById(id)
      .populate("roditeljId", "ime prezime email telefon")
      .populate(
        "playroomId",
        "naziv adresa grad kontaktTelefon kontaktEmail vlasnikId",
      )
      .populate("timeSlotId", "datum vremeOd vremeDo")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Rezervacija nije pronađena",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwnerOfBooking =
      booking.roditeljId &&
      booking.roditeljId._id &&
      booking.roditeljId._id.toString() === req.user.id;
    const isPlayroomOwner =
      booking.playroomId?.vlasnikId &&
      booking.playroomId.vlasnikId.toString() === req.user.id;

    if (!isOwnerOfBooking && !isPlayroomOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da vidite ovu rezervaciju",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Potvrdi rezervaciju
// @route   PUT /api/bookings/:id/confirm
// @access  Private (vlasnik ili admin)
exports.confirmBooking = async (req, res, next) => {
  try {
    const { id } = req.validated.params;

    const confirmedBooking = await bookingService.confirmBookingById({
      bookingId: id,
      currentUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Rezervacija je potvrđena",
      data: confirmedBooking,
    });
  } catch (error) {
    next(error);
  }
};
