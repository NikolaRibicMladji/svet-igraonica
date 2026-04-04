const Booking = require("../models/Booking");
const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const bookingService = require("../services/bookingService");
const User = require("../models/User");

const BOOKING_STATUS = require("../constants/bookingStatus");
const ROLES = require("../constants/roles");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const generateAccessToken = require("../utils/generateToken");

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// @desc    Kreiraj novu rezervaciju (ulogovan korisnik)
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBookingWithEmails({
      slotId: req.body.slotId,
      user: req.user || null,
      payload: {
        imeRoditelja: req.body.imeRoditelja || req.body.ime,
        prezimeRoditelja: req.body.prezimeRoditelja || req.body.prezime || "-",
        emailRoditelja:
          req.body.emailRoditelja || req.body.email || "nije-uneto@example.com",
        telefon: req.body.telefon,
        brojDece: req.body.brojDece,
        brojRoditelja: req.body.brojRoditelja,
        napomena: req.body.napomena,
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
  try {
    const {
      slotId,
      ime,
      prezime,
      email,
      telefon,
      password,
      brojDece,
      brojRoditelja,
      napomena,
    } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "Korisnik sa ovom email adresom već postoji. Prijavite se da biste završili rezervaciju.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      ime: ime.trim(),
      prezime: prezime.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      telefon: telefon.trim(),
      role: ROLES.RODITELJ,
      deca: [],
    });

    const accessToken = generateAccessToken(newUser);

    const refreshToken = jwt.sign(
      { id: newUser._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    const booking = await bookingService.createBookingWithEmails({
      slotId,
      user: newUser,
      payload: {
        imeRoditelja: ime.trim(),
        prezimeRoditelja: prezime.trim(),
        emailRoditelja: normalizedEmail,
        telefon: telefon.trim(),
        brojDece,
        brojRoditelja,
        napomena,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Uspešna registracija i rezervacija",
      accessToken,
      user: {
        id: newUser._id,
        ime: newUser.ime,
        prezime: newUser.prezime,
        email: newUser.email,
        telefon: newUser.telefon,
        role: newUser.role,
      },
      data: booking,
    });
  } catch (error) {
    next(error);
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
    const playrooms = await Playroom.find({ vlasnikId: req.user.id });
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
    const booking = await Booking.findById(req.params.id)
      .populate("playroomId", "naziv adresa grad vlasnikId")
      .populate("roditeljId", "ime prezime email telefon");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Rezervacija nije pronađena",
      });
    }

    const isOwnerOfBooking =
      booking.roditeljId &&
      booking.roditeljId._id &&
      booking.roditeljId._id.toString() === req.user.id;

    const isAdmin = req.user.role === "admin";

    let isPlayroomOwner = false;
    if (booking.playroomId?.vlasnikId) {
      isPlayroomOwner = booking.playroomId.vlasnikId.toString() === req.user.id;
    } else {
      const playroom = await Playroom.findById(booking.playroomId);
      isPlayroomOwner = playroom?.vlasnikId?.toString() === req.user.id;
    }

    if (!isOwnerOfBooking && !isPlayroomOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da otkažete ovu rezervaciju",
      });
    }

    if (booking.status === BOOKING_STATUS.OTKAZANO) {
      return res.status(400).json({
        success: false,
        message: "Rezervacija je već otkazana",
      });
    }

    booking.status = BOOKING_STATUS.OTKAZANO;
    await booking.save();

    const timeSlot = await TimeSlot.findById(booking.timeSlotId);
    if (timeSlot) {
      timeSlot.zauzeto = false;
      timeSlot.slobodno = timeSlot.maxDece || 20;
      await timeSlot.save();
    }

    await bookingService.sendCancellationEmail(booking);

    res.status(200).json({
      success: true,
      message: "Rezervacija je otkazana",
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
    const booking = await Booking.findById(req.params.id)
      .populate("playroomId", "naziv adresa grad vlasnikId")
      .populate("roditeljId", "ime prezime email telefon");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Rezervacija nije pronađena",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isPlayroomOwner =
      booking.playroomId?.vlasnikId &&
      booking.playroomId.vlasnikId.toString() === req.user.id;

    if (!isPlayroomOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da potvrdite ovu rezervaciju",
      });
    }

    if (booking.status === BOOKING_STATUS.OTKAZANO) {
      return res.status(400).json({
        success: false,
        message: "Otkazana rezervacija ne može biti potvrđena",
      });
    }

    if (booking.status === BOOKING_STATUS.POTVRDJENO) {
      return res.status(400).json({
        success: false,
        message: "Rezervacija je već potvrđena",
      });
    }

    booking.status = BOOKING_STATUS.POTVRDJENO;
    await booking.save();

    await bookingService.sendConfirmationEmail(booking);

    res.status(200).json({
      success: true,
      message: "Rezervacija je potvrđena",
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
    const booking = await Booking.findById(req.params.id)
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
