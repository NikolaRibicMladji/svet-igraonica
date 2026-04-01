const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");

const reserveSlot = async ({ slotId, user, payload }) => {
  let slot;

  try {
    // 🔒 1. Spreči dupli booking
    const existing = await Booking.findOne({
      timeSlotId: slotId,
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    });

    if (existing) {
      const error = new Error("Termin je već rezervisan");
      error.statusCode = 400;
      throw error;
    }

    // 🧾 2. Validacija podataka
    if (!payload.imeRoditelja || !payload.telefon) {
      const error = new Error("Nedostaju podaci");
      error.statusCode = 400;
      throw error;
    }

    // 🔐 3. Atomic lock slota
    slot = await TimeSlot.findOneAndUpdate(
      {
        _id: slotId,
        zauzeto: false,
        slobodno: { $gt: 0 },
      },
      {
        $set: {
          zauzeto: true,
          slobodno: 0,
        },
      },
      { new: true },
    );

    if (!slot) {
      const error = new Error("Termin je već zauzet ili ne postoji");
      error.statusCode = 400;
      throw error;
    }

    // ⏰ 4. Provera prošlog termina
    if (new Date(slot.datum) < new Date()) {
      await TimeSlot.findByIdAndUpdate(slot._id, {
        zauzeto: false,
        slobodno: slot.maxDece || 20,
      });

      const error = new Error("Ne možeš rezervisati prošli termin");
      error.statusCode = 400;
      throw error;
    }

    // 📝 5. Kreiranje booking-a
    const booking = await Booking.create({
      playroomId: slot.playroomId,
      timeSlotId: slot._id,
      datum: slot.datum,
      vremeOd: slot.vremeOd,
      vremeDo: slot.vremeDo,
      ukupnaCena: slot.cena || 0,
      status: BOOKING_STATUS.CEKANJE,

      imeRoditelja: payload.imeRoditelja,
      telefon: payload.telefon,
      brojDece: payload.brojDece || 1,
      napomena: payload.napomena || "",

      userId: user?._id || null,
    });

    return booking;
  } catch (err) {
    // 🔁 6. Rollback ako pukne
    if (slot) {
      await TimeSlot.findByIdAndUpdate(slotId, {
        zauzeto: false,
        slobodno: slot.maxDece || 20,
      });
    }

    throw err;
  }
};

module.exports = {
  reserveSlot,
};
