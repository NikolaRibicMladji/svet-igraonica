const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");

// @desc    Kreiraj novi termin (samo vlasnik igraonice)
// @route   POST /api/timeslots
// @access  Private (vlasnik)
exports.createTimeSlot = async (req, res) => {
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

    const timeSlot = await TimeSlot.create({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      zauzeto: false, // uvek slobodan na početku
      cena,
    });

    res.status(201).json({
      success: true,
      data: timeSlot,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};

// @desc    Dohvati sve termine za igraonicu (dinamički - iz radnog vremena)
// @route   GET /api/timeslots/playroom/:playroomId
// @access  Public
exports.getTimeSlotsByPlayroom = async (req, res) => {
  try {
    const { playroomId } = req.params;
    const { datum } = req.query;

    if (!datum) {
      return res.status(400).json({
        success: false,
        message: "Datum je obavezan",
      });
    }

    // Proveri da li igraonica postoji
    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    // Proveri da li igraonica radi tog dana
    const selectedDate = new Date(datum);
    const danUNedelji = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const danMap = {
      monday: "ponedeljak",
      tuesday: "utorak",
      wednesday: "sreda",
      thursday: "cetvrtak",
      friday: "petak",
      saturday: "subota",
      sunday: "nedelja",
    };

    const radnoVreme = playroom.radnoVreme?.[danMap[danUNedelji]];

    // Ako igraonica ne radi taj dan
    if (!radnoVreme || !radnoVreme.od || !radnoVreme.do) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "Igraonica ne radi ovog dana",
      });
    }

    // Dinamički generiši termine na svaka 2 sata
    const startHour = parseInt(radnoVreme.od.split(":")[0]);
    const endHour = parseInt(radnoVreme.do.split(":")[0]);
    const timeSlots = [];

    // Proveri postojeće rezervacije za taj dan
    const existingBookings = await Booking.find({
      playroomId,
      datum: {
        $gte: new Date(datum + "T00:00:00.000Z"),
        $lt: new Date(datum + "T23:59:59.999Z"),
      },
    });

    const bookedTimes = existingBookings.map((b) => ({
      vremeOd: b.vremeOd,
      vremeDo: b.vremeDo,
      booking: b,
    }));

    // PRAVILNA PROVERA
    for (let hour = startHour; hour < endHour; hour += 2) {
      const vremeOd = `${hour.toString().padStart(2, "0")}:00`;
      const vremeDo = `${(hour + 2).toString().padStart(2, "0")}:00`;

      const foundBooking = existingBookings.find((b) => b.vremeOd === vremeOd);
      const isZauzeto = foundBooking ? true : false; // <--- OVO JE KLJUČNO

      timeSlots.push({
        _id: `${playroomId}_${datum}_${vremeOd}`,
        playroomId,
        datum: new Date(datum),
        vremeOd,
        vremeDo,
        cena: playroom.cenovnik?.osnovni || 800,
        zauzeto: isZauzeto,
        booking: null,
      });
    }

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati svoje termine (za vlasnika)
// @route   GET /api/timeslots/my
// @access  Private (vlasnik)
exports.getMyTimeSlots = async (req, res) => {
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
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati jedan termin po ID
// @route   GET /api/timeslots/:id
// @access  Public
exports.getTimeSlotById = async (req, res) => {
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
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Ažuriraj termin
// @route   PUT /api/timeslots/:id
// @access  Private (vlasnik ili admin)
exports.updateTimeSlot = async (req, res) => {
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
    if (maxDece) {
      const razlika = maxDece - timeSlot.maxDece;
      timeSlot.maxDece = maxDece;
      timeSlot.slobodno += razlika;
    }
    if (cena) timeSlot.cena = cena;
    if (aktivno !== undefined) timeSlot.aktivno = aktivno;

    await timeSlot.save();
    res.status(200).json({
      success: true,
      data: timeSlot,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Obriši termin
// @route   DELETE /api/timeslots/:id
// @access  Private (vlasnik ili admin)
exports.deleteTimeSlot = async (req, res) => {
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

    await timeSlot.deleteOne();
    res.status(200).json({
      success: true,
      message: "Termin je obrisan",
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Ručno generiši termine za igraonicu
// @route   POST /api/timeslots/generate/:playroomId
// @access  Private (vlasnik)
exports.generateSlotsForPlayroom = async (req, res) => {
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
      message: `Generisano ${result.createdCount} novih termina`,
      data: result,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};

// @desc    Dohvati slobodne termine za igraonicu
// @route   GET /api/timeslots/playroom/:playroomId/available
// @access  Public
exports.getAvailableTimeSlots = async (req, res) => {
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
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
    });
  }
};
// @desc    Dohvati sve termine za vlasnika (sa detaljima)
// @route   GET /api/timeslots/playroom/:playroomId/all
// @access  Private (vlasnik)
exports.getAllTimeSlotsForOwner = async (req, res) => {
  try {
    const { playroomId } = req.params;
    const { datum } = req.query;

    if (!datum) {
      return res.status(400).json({
        success: false,
        message: "Datum je obavezan",
      });
    }

    // Proveri da li vlasnik ima pravo
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

    // Proveri da li igraonica radi tog dana
    const selectedDate = new Date(datum);
    const danUNedelji = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const danMap = {
      monday: "ponedeljak",
      tuesday: "utorak",
      wednesday: "sreda",
      thursday: "cetvrtak",
      friday: "petak",
      saturday: "subota",
      sunday: "nedelja",
    };

    const radnoVreme = playroom.radnoVreme?.[danMap[danUNedelji]];

    // Ako igraonica ne radi taj dan
    if (!radnoVreme || !radnoVreme.od || !radnoVreme.do) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "Igraonica ne radi ovog dana",
        playroom: { id: playroom._id, naziv: playroom.naziv },
      });
    }

    // Dinamički generiši termine na svaka 2 sata
    const startHour = parseInt(radnoVreme.od.split(":")[0]);
    const endHour = parseInt(radnoVreme.do.split(":")[0]);
    const timeSlots = [];

    // Proveri postojeće rezervacije za taj dan
    const existingBookings = await Booking.find({
      playroomId,
      datum: {
        $gte: new Date(datum + "T00:00:00.000Z"),
        $lt: new Date(datum + "T23:59:59.999Z"),
      },
    }).populate("roditeljId", "ime prezime email telefon");

    // DODAJ OVE LOGOVE
    console.log("======= DEBUG =======");
    console.log("playroomId:", playroomId);
    console.log("datum:", datum);
    console.log("existingBookings.length:", existingBookings.length);
    console.log("existingBookings:", JSON.stringify(existingBookings, null, 2));
    console.log("====================");

    // Cena iz igraonice
    const cenaPoTerminu = playroom.cenovnik?.osnovni || 800;

    for (let hour = startHour; hour < endHour; hour += 2) {
      const vremeOd = `${hour.toString().padStart(2, "0")}:00`;
      const vremeDo = `${(hour + 2).toString().padStart(2, "0")}:00`;

      // Proveri da li postoji rezervacija za OVO TAČNO VREME
      const foundBooking = existingBookings.find((b) => b.vremeOd === vremeOd);

      // AKO POSTOJI REZERVACIJA -> ZAUZETO, inače SLOBODNO
      const isZauzeto = foundBooking ? true : false;

      // DODAJ OVAJ LOG
      console.log(
        `Termin ${vremeOd}-${vremeDo}: foundBooking = ${foundBooking ? "DA" : "NE"}, isZauzeto = ${isZauzeto}`,
      );

      timeSlots.push({
        _id: `${playroomId}_${datum}_${vremeOd}`,
        playroomId,
        datum: new Date(datum),
        vremeOd,
        vremeDo,
        cena: cenaPoTerminu,
        zauzeto: isZauzeto,
        booking: foundBooking
          ? {
              id: foundBooking._id,
              roditelj: foundBooking.roditeljId,
              napomena: foundBooking.napomena,
              createdAt: foundBooking.createdAt,
            }
          : null,
      });
    }

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots,
      playroom: {
        id: playroom._id,
        naziv: playroom.naziv,
        grad: playroom.grad,
      },
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};

// @desc    Ručno zauzmi termin (vlasnik rezerviše)
// @route   POST /api/timeslots/:id/manual-book
// @access  Private (vlasnik)
exports.manualBookTimeSlot = async (req, res) => {
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

    if (timeSlot.zauzeto) {
      return res.status(400).json({
        success: false,
        message: "Termin je već zauzet",
      });
    }

    // Izračunaj ukupnu cenu
    const ukupnaCena = timeSlot.cena * (brojDece || 1);

    // Kreiraj rezervaciju za vlasnika
    const Booking = require("../models/Booking");
    const booking = await Booking.create({
      roditeljId: req.user.id,
      playroomId: timeSlot.playroomId,
      datum: timeSlot.datum,
      vremeOd: timeSlot.vremeOd,
      vremeDo: timeSlot.vremeDo,
      brojDece: brojDece || 1,
      ukupnaCena: ukupnaCena,
      napomena:
        napomena ||
        `Ručna rezervacija od strane vlasnika ${req.user.ime} ${req.user.prezime}`,
      status: "potvrdjeno",
    });

    // ZAUZMI TERMIN
    timeSlot.zauzeto = true;
    await timeSlot.save();

    console.log(
      `✅ Ručna rezervacija: ${playroom.naziv} - ${timeSlot.vremeOd} do ${timeSlot.vremeDo} (${brojDece || 1} dece, ${ukupnaCena} RSD)`,
    );

    res.status(200).json({
      success: true,
      data: booking,
      message: `Termin je uspešno zauzet. Ukupno: ${ukupnaCena} RSD`,
    });
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({
      success: false,
      message: "Greška na serveru",
      error: error.message,
    });
  }
};
