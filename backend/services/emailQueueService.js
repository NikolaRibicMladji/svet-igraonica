const Booking = require("../models/Booking");

const {
  sendBookingConfirmation,
  sendBookingConfirmationToOwner,
  sendBookingCancellation,
  sendCancellationToOwner,
} = require("../utils/emailService");

const queueBookingEmails = async (bookingId) => {
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

  if (!playroom || !vlasnik) {
    return;
  }

  if (booking.status === "CEKANJE") {
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

  if (booking.status === "OTKAZANO") {
    await Promise.all([
      sendBookingCancellation(booking, roditelj, playroom, timeSlot),

      sendCancellationToOwner(booking, roditelj, playroom, timeSlot, vlasnik),
    ]);
  }
};

module.exports = {
  queueBookingEmails,
};
