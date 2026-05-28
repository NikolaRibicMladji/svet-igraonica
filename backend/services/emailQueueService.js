const Booking = require("../models/Booking");
const logger = require("../utils/logger");

const {
  sendBookingConfirmation,
  sendBookingConfirmationToOwner,
  sendBookingCancellation,
  sendCancellationToOwner,
  sendBookingApproved,
} = require("../utils/emailService");

const queueBookingEmails = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "playroomId",
        populate: {
          path: "vlasnikId",
          select: "ime prezime email",
        },
      })
      .populate("roditeljId")
      .populate("timeSlotId")
      .lean();

    if (!booking) {
      return;
    }

    const playroom = booking.playroomId;
    const roditelj = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
      telefon: booking.telefonRoditelja,
    };

    const vlasnik = playroom?.vlasnikId;
    const timeSlot = booking.timeSlotId || booking;
    const status = String(booking.status || "").toLowerCase();

    if (!playroom || !vlasnik) {
      return;
    }

    if (status === "cekanje") {
      await Promise.all([
        sendBookingConfirmation(booking, roditelj, playroom, timeSlot),

        sendBookingConfirmationToOwner(
          booking,
          roditelj,
          playroom,
          timeSlot,
          vlasnik,
        ),
      ]);
    }

    if (status === "potvrdjeno") {
      await sendBookingApproved(booking, roditelj, playroom, timeSlot);
    }

    if (status === "otkazano") {
      await Promise.all([
        sendBookingCancellation(booking, roditelj, playroom, timeSlot),

        sendCancellationToOwner(booking, roditelj, playroom, timeSlot, vlasnik),
      ]);
    }
  } catch (error) {
    logger.error("QUEUE BOOKING EMAIL ERROR:", error.message);
  }
};

module.exports = {
  queueBookingEmails,
};
