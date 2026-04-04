const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");

const reserveSlot = async ({ slotId, user, payload }) => {
  let slot = null;

  try {
    // 🔒 spreči dupli booking
    const existing = await Booking.findOne({
      timeSlotId: slotId,
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    });

    if (existing) {
      const error = new Error("Termin je već rezervisan");
      error.statusCode = 400;
      throw error;
    }

    // 🧾 validacija podataka
    if (
      !payload?.imeRoditelja ||
      !payload?.prezimeRoditelja ||
      !payload?.emailRoditelja ||
      !payload?.telefon
    ) {
      const error = new Error("Nedostaju podaci za rezervaciju");
      error.statusCode = 400;
      throw error;
    }

    const brojDece = Number(payload.brojDece || 1);
    const brojRoditelja = Number(payload.brojRoditelja || 0);

    if (Number.isNaN(brojDece) || brojDece < 1) {
      const error = new Error("Broj dece mora biti validan");
      error.statusCode = 400;
      throw error;
    }

    if (Number.isNaN(brojRoditelja) || brojRoditelja < 0) {
      const error = new Error("Broj roditelja mora biti validan");
      error.statusCode = 400;
      throw error;
    }

    // 🔐 atomic lock slota
    slot = await lockSlot(slotId);

    if (!slot) {
      const error = new Error("Termin je već zauzet ili ne postoji");
      error.statusCode = 400;
      throw error;
    }

    // ⏰ prošli termin
    const slotDateTime = new Date(slot.datum);
    const [endHour, endMinute] = String(slot.vremeDo || "00:00")
      .split(":")
      .map((v) => parseInt(v, 10));

    slotDateTime.setHours(endHour || 0, endMinute || 0, 0, 0);

    if (slotDateTime <= new Date()) {
      await unlockSlot(slot._id);

      const error = new Error("Ne možeš rezervisati prošli termin");
      error.statusCode = 400;
      throw error;
    }

    // 💰 cena
    const ukupnaCena = (slot.cena || 0) * brojDece;

    // 📝 booking
    const booking = await Booking.create({
      roditeljId: user?._id || null,
      playroomId: slot.playroomId,
      timeSlotId: slot._id,
      datum: slot.datum,
      vremeOd: slot.vremeOd,
      vremeDo: slot.vremeDo,
      brojDece,
      brojRoditelja,
      ukupnaCena,
      status: BOOKING_STATUS.CEKANJE,
      napomena: payload.napomena || "",
      imeRoditelja: payload.imeRoditelja,
      prezimeRoditelja: payload.prezimeRoditelja,
      emailRoditelja: payload.emailRoditelja,
      telefonRoditelja: payload.telefon,
    });

    return booking;
  } catch (err) {
    // 🔁 rollback
    if (slot) {
      await unlockSlot(slot._id);
    }

    throw err;
  }
};

const {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingConfirmationToOwner,
} = require("../utils/emailService");

// 🔥 CENTRALIZOVANO SLANJE EMAILOVA
const handleBookingEmails = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("playroomId", "naziv adresa grad vlasnikId")
      .populate("roditeljId", "ime prezime email telefon")
      .populate("timeSlotId");

    if (!booking) return;

    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
      telefon: booking.telefonRoditelja,
    };

    const playroom = booking.playroomId;

    const timeSlot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      await sendBookingConfirmation(booking, userForEmail, playroom, timeSlot);
    }

    if (playroom?.vlasnikId) {
      await sendBookingConfirmationToOwner(booking, playroom, timeSlot);
    }
  } catch (err) {
    console.error("EMAIL ERROR:", err.message);
  }
};

const createBookingWithEmails = async (data) => {
  const booking = await reserveSlot(data);

  // 🔥 email ide ovde, ne u controller
  await handleBookingEmails(booking._id);

  return booking;
};

const sendCancellationEmail = async (booking) => {
  try {
    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
    };

    const playroom = booking.playroomId;

    const slot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      await sendBookingCancellation(userForEmail, playroom, slot);
    }
  } catch (error) {
    console.error("Greška pri slanju emaila (cancel):", error.message);
  }
};

const sendConfirmationEmail = async (booking) => {
  try {
    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
    };

    const playroom = booking.playroomId;

    const slot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      await sendBookingConfirmation(booking, userForEmail, playroom, slot);
    }
  } catch (error) {
    console.error("Greška pri slanju emaila (confirm):", error.message);
  }
};

const lockSlot = async (slotId) => {
  return TimeSlot.findOneAndUpdate(
    {
      _id: slotId,
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
    { new: true },
  );
};

const unlockSlot = async (slotId) => {
  const slot = await TimeSlot.findById(slotId);

  if (!slot) return null;

  return TimeSlot.findByIdAndUpdate(
    slotId,
    {
      zauzeto: false,
      slobodno: slot.maxDece || 20,
    },
    { new: true },
  );
};

module.exports = {
  reserveSlot,
  createBookingWithEmails,
  sendCancellationEmail,
  sendConfirmationEmail,
  lockSlot,
  unlockSlot,
};
