const Booking = require("../models/Booking");
const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");

// @desc    Kreiraj novu rezervaciju (dinamički termin)
// @route   POST /api/bookings
// @access  Private (roditelj)
exports.createBooking = async (req, res) => {
  try {
    const { playroomId, datum, vremeOd, vremeDo, brojDece, napomena } =
      req.body;

    console.log("Primljeni podaci:", {
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      brojDece,
    });

    // Proveri da li igraonica postoji
    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Proveri da li već postoji rezervacija za ovo vreme
    const existingBooking = await Booking.findOne({
      playroomId,
      datum: new Date(datum),
      vremeOd,
      vremeDo,
      status: { $ne: "otkazano" },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Ovaj termin je već zauzet",
      });
    }

    // Izračunaj ukupnu cenu
    const ukupnaCena = playroom.cenovnik?.osnovni * (brojDece || 1);

    // Kreiraj rezervaciju
    const booking = await Booking.create({
      roditeljId: req.user.id,
      playroomId,
      datum: new Date(datum),
      vremeOd,
      vremeDo,
      brojDece: brojDece || 1,
      ukupnaCena,
      napomena,
      status: "potvrdjeno",
    });

    console.log(`✅ Rezervacija kreirana: ${booking._id}`);

    res.status(201).json({
      success: true,
      data: booking,
      message: "Rezervacija je uspešno kreirana",
    });
  } catch (error) {
    console.error("Greška pri kreiranju rezervacije:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};

// @desc    Dohvati moje rezervacije (roditelj)
// @route   GET /api/bookings/my
// @access  Private (roditelj)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ roditeljId: req.user.id })
      .populate("playroomId", "naziv adresa grad")
      .populate("timeSlotId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati rezervacije za moje igraonice (vlasnik)
// @route   GET /api/bookings/owner
// @access  Private (vlasnik)
exports.getOwnerBookings = async (req, res) => {
  try {
    // Pronađi sve igraonice vlasnika
    const playrooms = await Playroom.find({ vlasnikId: req.user.id });
    const playroomIds = playrooms.map((p) => p._id);

    const bookings = await Booking.find({ playroomId: { $in: playroomIds } })
      .populate("roditeljId", "ime prezime email telefon")
      .populate("playroomId", "naziv")
      .populate("timeSlotId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Otkaži rezervaciju
// @route   PUT /api/bookings/:id/cancel
// @access  Private (roditelj ili vlasnik)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Rezervacija nije pronađena",
      });
    }

    // Proveri da li korisnik ima pravo
    if (booking.roditeljId.toString() !== req.user.id) {
      const playroom = await Playroom.findById(booking.playroomId);
      if (
        playroom.vlasnikId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Nemate pravo da otkažete ovu rezervaciju",
        });
      }
    }

    if (booking.status === "otkazano") {
      return res.status(400).json({
        success: false,
        message: "Rezervacija je već otkazana",
      });
    }

    // Vrati slobodna mesta
    const timeSlot = await TimeSlot.findById(booking.timeSlotId);
    if (timeSlot) {
      timeSlot.slobodno += booking.brojDece;
      await timeSlot.save();
    }

    booking.status = "otkazano";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Rezervacija je otkazana",
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Potvrdi rezervaciju (vlasnik)
// @route   PUT /api/bookings/:id/confirm
// @access  Private (vlasnik)
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Rezervacija nije pronađena",
      });
    }

    const playroom = await Playroom.findById(booking.playroomId);
    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da potvrdite ovu rezervaciju",
      });
    }

    booking.status = "potvrdjeno";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Rezervacija je potvrđena",
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};
