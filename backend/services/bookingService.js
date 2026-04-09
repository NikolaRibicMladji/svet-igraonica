const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");

const buildDateTime = (date, time) => {
  const [hour, minute] = String(time || "00:00")
    .split(":")
    .map((v) => parseInt(v, 10));

  const d = new Date(date);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hour || 0,
    minute || 0,
    0,
    0,
  );
};

const reserveSlot = async ({
  slotId,
  user,
  payload,
  session: externalSession = null,
}) => {
  const ownSession = !externalSession;
  const session = externalSession || (await mongoose.startSession());
  let booking = null;

  try {
    console.log("📌 RESERVE SLOT:", {
      slotId,
      user: user?._id || null,
      time: new Date().toISOString(),
    });
    if (ownSession) {
      session.startTransaction();
    }

    if (
      !payload?.imeRoditelja ||
      !payload?.prezimeRoditelja ||
      !payload?.emailRoditelja ||
      !payload?.telefonRoditelja
    ) {
      throw new ErrorResponse("Nedostaju podaci za rezervaciju", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      throw new ErrorResponse("Nevalidan slot ID", 400);
    }

    const slot = await TimeSlot.findOneAndUpdate(
      {
        _id: slotId,
        zauzeto: false,
        aktivno: true,
        vanRadnogVremena: false,
      },
      {
        $set: {
          zauzeto: true,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!slot) {
      throw new ErrorResponse("Termin je već zauzet ili ne postoji", 400);
    }

    const slotEnd = buildDateTime(slot.datum, slot.vremeDo);

    if (slotEnd <= new Date()) {
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse("Ne možeš rezervisati prošli termin", 400);
    }

    const ukupnaCena = Number(slot.cena) || 0;

    let created;

    try {
      created = await Booking.create(
        [
          {
            roditeljId: user?._id || null,
            playroomId: slot.playroomId,
            timeSlotId: slot._id,
            datum: slot.datum,
            vremeOd: slot.vremeOd,
            vremeDo: slot.vremeDo,
            ukupnaCena,
            status: BOOKING_STATUS.CEKANJE,
            napomena: payload.napomena || "",
            imeRoditelja: payload.imeRoditelja.trim(),
            prezimeRoditelja: payload.prezimeRoditelja.trim(),
            emailRoditelja: payload.emailRoditelja.trim().toLowerCase(),
            telefonRoditelja: payload.telefonRoditelja.trim(),
          },
        ],
        { session },
      );
    } catch (err) {
      if (err.code === 11000) {
        await TimeSlot.findByIdAndUpdate(
          slot._id,
          { $set: { zauzeto: false } },
          { session },
        );

        throw new ErrorResponse("Termin je upravo zauzet, pokušaj ponovo", 400);
      }

      throw err;
    }

    booking = created[0];

    if (ownSession) {
      await session.commitTransaction();
    }

    console.log("✅ BOOKING CREATED:", {
      bookingId: booking._id,
      slotId,
      user: user?._id || null,
      time: new Date().toISOString(),
    });

    return booking;
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (ownSession) {
      session.endSession();
    }
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
      .populate({
        path: "playroomId",
        select: "naziv adresa grad vlasnikId",
        populate: {
          path: "vlasnikId",
          select: "ime prezime email",
        },
      })
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

    if (playroom?.vlasnikId?.email) {
      await sendBookingConfirmationToOwner(
        booking,
        userForEmail,
        playroom,
        timeSlot,
        playroom.vlasnikId,
      );
    }
  } catch (err) {
    console.error("EMAIL ERROR:", err.message);
  }
};

const createBookingWithEmails = async (data) => {
  const booking = await reserveSlot(data);

  setImmediate(async () => {
    try {
      await handleBookingEmails(booking._id);
    } catch (error) {
      console.error("Greška pri slanju booking emailova:", error.message);
    }
  });

  return booking;
};

const getBookingWithRelations = async (bookingId, session = null) => {
  let query = Booking.findById(bookingId)
    .populate({
      path: "playroomId",
      select: "naziv adresa grad vlasnikId",
      populate: {
        path: "vlasnikId",
        select: "ime prezime email",
      },
    })
    .populate("roditeljId", "ime prezime email telefon")
    .populate("timeSlotId");

  if (session) {
    query = query.session(session);
  }

  return query;
};

const canUserManageBooking = (booking, user) => {
  if (!booking || !user) return false;

  const isAdmin = user.role === "admin";

  const isOwnerOfBooking =
    booking.roditeljId &&
    booking.roditeljId._id &&
    booking.roditeljId._id.toString() === user.id;

  const isPlayroomOwner =
    booking.playroomId?.vlasnikId &&
    (booking.playroomId.vlasnikId._id?.toString() === user.id ||
      booking.playroomId.vlasnikId.toString() === user.id);

  return {
    isAdmin,
    isOwnerOfBooking,
    isPlayroomOwner,
  };
};

const canConfirmPastBooking = (booking) => {
  const bookingEnd = buildDateTime(booking.datum, booking.vremeDo);

  return bookingEnd > new Date();
};

const cancelBookingById = async ({ bookingId, currentUser }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const booking = await getBookingWithRelations(bookingId, session);

    if (!booking) {
      throw new ErrorResponse("Rezervacija nije pronađena", 404);
    }

    const { isAdmin, isOwnerOfBooking, isPlayroomOwner } = canUserManageBooking(
      booking,
      currentUser,
    );

    if (!isOwnerOfBooking && !isPlayroomOwner && !isAdmin) {
      throw new ErrorResponse("Nemate pravo da otkažete ovu rezervaciju", 403);
    }

    if (booking.status === BOOKING_STATUS.OTKAZANO) {
      throw new ErrorResponse("Rezervacija je već otkazana", 400);
    }

    if (booking.status === BOOKING_STATUS.ZAVRSENO) {
      throw new ErrorResponse(
        "Završena rezervacija ne može biti otkazana",
        400,
      );
    }

    booking.status = BOOKING_STATUS.OTKAZANO;
    await booking.save({ session });

    const unlockedSlot = await unlockSlot(
      booking.timeSlotId?._id || booking.timeSlotId,
      session,
    );

    if (!unlockedSlot) {
      throw new ErrorResponse("Slot za ovu rezervaciju nije pronađen", 404);
    }

    await session.commitTransaction();

    console.log("❌ BOOKING CANCELED:", {
      bookingId,
      user: currentUser?.id || null,
      time: new Date().toISOString(),
    });

    setImmediate(async () => {
      try {
        await sendCancellationEmail(booking);

        if (booking.playroomId?.vlasnikId?.email) {
          await require("../utils/emailService").sendCancellationToOwner(
            booking,
            booking.roditeljId,
            booking.playroomId,
            {
              datum: booking.datum,
              vremeOd: booking.vremeOd,
              vremeDo: booking.vremeDo,
            },
            booking.playroomId.vlasnikId,
          );
        }
      } catch (error) {
        console.error(
          "Greška pri slanju emaila nakon otkazivanja rezervacije:",
          error.message,
        );
      }
    });

    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const confirmBookingById = async ({ bookingId, currentUser }) => {
  const booking = await getBookingWithRelations(bookingId);

  if (!booking) {
    throw new ErrorResponse("Rezervacija nije pronađena", 404);
  }

  const { isAdmin, isPlayroomOwner } = canUserManageBooking(
    booking,
    currentUser,
  );

  if (!isPlayroomOwner && !isAdmin) {
    throw new ErrorResponse("Nemate pravo da potvrdite ovu rezervaciju", 403);
  }

  if (booking.status === BOOKING_STATUS.OTKAZANO) {
    throw new ErrorResponse("Otkazana rezervacija ne može biti potvrđena", 400);
  }

  if (booking.status === BOOKING_STATUS.POTVRDJENO) {
    throw new ErrorResponse("Rezervacija je već potvrđena", 400);
  }

  if (booking.status === BOOKING_STATUS.ZAVRSENO) {
    throw new ErrorResponse(
      "Završena rezervacija ne može biti ponovo potvrđena",
      400,
    );
  }

  if (!canConfirmPastBooking(booking)) {
    throw new ErrorResponse("Prošli termin ne može biti potvrđen", 400);
  }

  booking.status = BOOKING_STATUS.POTVRDJENO;
  await booking.save();

  console.log("✅ BOOKING CONFIRMED:", {
    bookingId,
    user: currentUser?.id || null,
    time: new Date().toISOString(),
  });

  setImmediate(async () => {
    try {
      await sendConfirmationEmail(booking);

      if (booking.playroomId?.vlasnikId?.email) {
        await sendBookingConfirmationToOwner(
          booking,
          booking.roditeljId,
          booking.playroomId,
          {
            datum: booking.datum,
            vremeOd: booking.vremeOd,
            vremeDo: booking.vremeDo,
          },
          booking.playroomId.vlasnikId,
        );
      }
    } catch (error) {
      console.error(
        "Greška pri slanju emaila nakon potvrde rezervacije:",
        error.message,
      );
    }
  });

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
      aktivno: true,
      vanRadnogVremena: false,
    },
    {
      $set: {
        zauzeto: true,
      },
    },
    { new: true },
  );
};

const unlockSlot = async (slotId, session = null) => {
  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    throw new ErrorResponse("Nevalidan slot ID za otključavanje", 400);
  }

  const options = { new: true };
  if (session) {
    options.session = session;
  }

  return TimeSlot.findByIdAndUpdate(
    slotId,
    {
      $set: {
        zauzeto: false,
      },
    },
    options,
  );
};

module.exports = {
  reserveSlot,
  createBookingWithEmails,
  handleBookingEmails,
  sendCancellationEmail,
  sendConfirmationEmail,
  lockSlot,
  unlockSlot,
  cancelBookingById,
  confirmBookingById,
  getBookingWithRelations,
};
