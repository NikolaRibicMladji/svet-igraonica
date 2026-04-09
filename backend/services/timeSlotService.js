const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");

const findDuplicateSlot = async ({ playroomId, datum, vremeOd, vremeDo }) => {
  return TimeSlot.findOne({
    playroomId,
    datum,
    vremeOd,
    vremeDo,
  });
};

const hasActiveBookingForSlot = async (timeSlotId) => {
  const existingBooking = await Booking.findOne({
    timeSlotId,
    status: { $ne: BOOKING_STATUS.OTKAZANO },
  });

  return !!existingBooking;
};

const deactivateSlotIfAllowed = async (timeSlot) => {
  const hasActiveBooking = await hasActiveBookingForSlot(timeSlot._id);

  if (hasActiveBooking || timeSlot.zauzeto) {
    const error = new Error(
      "Ne možeš deaktivirati termin koji ima rezervaciju ili je zauzet",
    );
    error.statusCode = 400;
    throw error;
  }

  const updated = await TimeSlot.findByIdAndUpdate(
    timeSlot._id,
    {
      $set: { aktivno: false },
    },
    { new: true },
  );

  return updated;
};

const deleteSlotIfAllowed = async (timeSlot) => {
  const hasActiveBooking = await hasActiveBookingForSlot(timeSlot._id);

  if (hasActiveBooking || timeSlot.zauzeto) {
    const error = new Error(
      "Ne možeš obrisati termin koji ima rezervaciju ili je zauzet",
    );
    error.statusCode = 400;
    throw error;
  }

  await TimeSlot.findByIdAndDelete(timeSlot._id);

  return true;
};

module.exports = {
  findDuplicateSlot,
  hasActiveBookingForSlot,
  deactivateSlotIfAllowed,
  deleteSlotIfAllowed,
};
