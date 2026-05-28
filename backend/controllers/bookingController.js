const Booking = require("../models/Booking");
const ROLES = require("../constants/roles");
const Playroom = require("../models/Playroom");
const {
  parseDateOnlyInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
} = require("../utils/dateTime");
const bookingService = require("../services/bookingService");
const authService = require("../services/authService");
const mongoose = require("mongoose");

const ErrorResponse = require("../utils/errorResponse");

const getBookingModePlayroom = async ({ playroomId, session = null }) => {
  let query = Playroom.findById(playroomId).select("_id rezimRezervacije");

  if (session) {
    query = query.session(session);
  }

  const playroom = await query.lean();

  if (!playroom) {
    throw new ErrorResponse("Igraonica nije pronađena", 404);
  }

  return playroom;
};

// @desc    Kreiraj novu rezervaciju (ulogovan korisnik)
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.RODITELJ) {
      throw new ErrorResponse(
        "Samo roditelj može napraviti rezervaciju ovom rutom",
        403,
      );
    }

    const {
      playroomId,
      timeSlotId,
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

    const playroom = await getBookingModePlayroom({ playroomId });

    const payload = {
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
    };

    let booking;

    if (playroom.rezimRezervacije === "fiksno") {
      if (!timeSlotId) {
        throw new ErrorResponse(
          "Morate izabrati jedan od ponuđenih termina",
          400,
        );
      }

      booking = await bookingService.reserveSlot({
        slotId: timeSlotId,
        expectedPlayroomId: playroomId,
        user: req.user || null,
        payload,
      });
    } else {
      if (timeSlotId) {
        throw new ErrorResponse(
          "Za fleksibilnu rezervaciju ne šaljite timeSlotId",
          400,
        );
      }

      booking = await bookingService.reserveCustomInterval({
        playroomId,
        datum,
        vremeOd,
        vremeDo,
        user: req.user || null,
        payload,
      });
    }

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
      timeSlotId,
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

    const playroom = await getBookingModePlayroom({
      playroomId,
      session,
    });

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

    const payload = {
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
    };

    let createdBooking;

    if (playroom.rezimRezervacije === "fiksno") {
      if (!timeSlotId) {
        throw new ErrorResponse(
          "Morate izabrati jedan od ponuđenih termina",
          400,
        );
      }

      createdBooking = await bookingService.reserveSlot({
        slotId: timeSlotId,
        expectedPlayroomId: playroomId,
        user: createdUser,
        payload,
        session,
      });
    } else {
      if (timeSlotId) {
        throw new ErrorResponse(
          "Za fleksibilnu rezervaciju ne šaljite timeSlotId",
          400,
        );
      }

      createdBooking = await bookingService.reserveCustomInterval({
        playroomId,
        datum,
        vremeOd,
        vremeDo,
        user: createdUser,
        payload,
        session,
      });
    }

    await session.commitTransaction();

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
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    next(error);
  } finally {
    await session.endSession();
  }
};

// @desc    Dohvati moje rezervacije (roditelj)
// @route   GET /api/bookings/my
// @access  Private (roditelj)
exports.getMyBookings = async (req, res, next) => {
  try {
    const { page, limit, status, datumOd, datumDo } = req.validated.query;
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

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
        .limit(safeLimit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
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
    const { page, limit, status, datumOd, datumDo, playroomId } =
      req.validated.query;

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;
    const isAdmin = req.user.role === ROLES.ADMIN;

    const filter = {};

    if (isAdmin) {
      if (playroomId) {
        filter.playroomId = playroomId;
      }
    } else {
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
            limit: safeLimit,
            pages: 0,
          },
          data: [],
        });
      }

      if (playroomId) {
        const ownsPlayroom = ownerPlayroomIds.some(
          (id) => id.toString() === playroomId,
        );

        if (!ownsPlayroom) {
          throw new ErrorResponse("Nemate pristup ovoj igraonici", 403);
        }

        filter.playroomId = playroomId;
      } else {
        filter.playroomId = { $in: ownerPlayroomIds };
      }
    }

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
        .limit(safeLimit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
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

    await bookingService.cancelBookingById({
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
      throw new ErrorResponse("Rezervacija nije pronađena", 404);
    }

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isOwnerOfBooking =
      booking.roditeljId &&
      booking.roditeljId._id &&
      booking.roditeljId._id.toString() === req.user.id;
    const isPlayroomOwner =
      booking.playroomId?.vlasnikId &&
      booking.playroomId.vlasnikId.toString() === req.user.id;

    if (!isOwnerOfBooking && !isPlayroomOwner && !isAdmin) {
      throw new ErrorResponse("Nemate pravo da vidite ovu rezervaciju", 403);
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
