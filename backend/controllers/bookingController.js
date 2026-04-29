const Booking = require("../models/Booking");

const Playroom = require("../models/Playroom");
const bookingService = require("../services/bookingService");
const User = require("../models/User");
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

    console.log("🟢 CREATE BOOKING:", {
      requestId: req.requestId,
      user: req.user?.id || null,
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      time: new Date().toISOString(),
    });

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

    await bookingService.handleBookingEmails(booking._id);

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
    console.log("🟡 GUEST BOOKING:", {
      requestId: req.requestId,
      email,
      time: new Date().toISOString(),
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
    await bookingService.handleBookingEmails(createdBooking._id);

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
    const bookings = await Booking.find({ roditeljId: req.user.id })
      .populate("playroomId", "naziv adresa grad slike")
      .populate("timeSlotId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
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
    const playrooms = await Playroom.find({ vlasnikId: req.user.id }).select(
      "_id",
    );
    const playroomIds = playrooms.map((p) => p._id);

    const bookings = await Booking.find({ playroomId: { $in: playroomIds } })
      .populate("roditeljId", "ime prezime email telefon")
      .populate("playroomId", "naziv adresa grad")
      .populate("timeSlotId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
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

    console.log("🔴 CANCEL BOOKING:", {
      requestId: req.requestId,
      bookingId: id,
      user: req.user?.id || null,
      time: new Date().toISOString(),
    });
    const canceledBooking = await bookingService.cancelBookingById({
      bookingId: id,
      currentUser: req.user,
    });

    await bookingService.sendCancellationEmailById(canceledBooking._id);

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
      .populate("timeSlotId");

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
