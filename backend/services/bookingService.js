const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");

const reserveSlot = async ({ slotId, user, payload }) => {
  const session = await mongoose.startSession();
  let booking = null;

  try {
    session.startTransaction();

    if (
      !payload?.imeRoditelja ||
      !payload?.prezimeRoditelja ||
      !payload?.emailRoditelja ||
      !payload?.telefon
    ) {
      throw new ErrorResponse("Nedostaju podaci za rezervaciju", 400);
    }

    const brojDece = Number(payload.brojDece || 1);
    const brojRoditelja = Number(payload.brojRoditelja || 0);

    if (Number.isNaN(brojDece) || brojDece < 1) {
      throw new ErrorResponse("Broj dece mora biti validan", 400);
    }

    if (Number.isNaN(brojRoditelja) || brojRoditelja < 0) {
      throw new ErrorResponse("Broj roditelja mora biti validan", 400);
    }

    const slot = await TimeSlot.findOneAndUpdate(
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
      {
        new: true,
        session,
      },
    );

    if (!slot) {
      throw new ErrorResponse(
        "Termin je već zauzet, neaktivan ili ne postoji",
        400,
      );
    }

    const slotDateTime = new Date(slot.datum);
    const [endHour, endMinute] = String(slot.vremeDo || "00:00")
      .split(":")
      .map((v) => parseInt(v, 10));

    slotDateTime.setHours(endHour || 0, endMinute || 0, 0, 0);

    if (slotDateTime <= new Date()) {
      throw new ErrorResponse("Ne možeš rezervisati prošli termin", 400);
    }

    const ukupnaCena = (slot.cena || 0) * brojDece;

    const created = await Booking.create(
      [
        {
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
        },
      ],
      { session },
    );

    booking = created[0];

    await session.commitTransaction();
    return booking;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
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

  slot.zauzeto = false;
  slot.slobodno = 1;

  await slot.save();

  return slot;
};

module.exports = {
  reserveSlot,
  createBookingWithEmails,
  sendCancellationEmail,
  sendConfirmationEmail,
  lockSlot,
  unlockSlot,
};
