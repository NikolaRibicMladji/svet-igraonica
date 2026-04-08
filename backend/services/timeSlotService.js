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
  const updated = await TimeSlot.findOneAndUpdate(
    {
      _id: timeSlot._id,
      zauzeto: false,
    },
    {
      $set: { aktivno: false },
    },
    { new: true },
  );

  if (!updated) {
    const error = new Error(
      "Ne možeš deaktivirati termin koji ima rezervaciju ili je zauzet",
    );
    error.statusCode = 400;
    throw error;
  }

  return updated;
};

const deleteSlotIfAllowed = async (timeSlot) => {
  const deleted = await TimeSlot.findOneAndDelete({
    _id: timeSlot._id,
    zauzeto: false,
  });

  if (!deleted) {
    const error = new Error(
      "Ne možeš obrisati termin koji ima rezervaciju ili je zauzet",
    );
    error.statusCode = 400;
    throw error;
  }

  return true;
};

module.exports = {
  findDuplicateSlot,
  hasActiveBookingForSlot,
  deactivateSlotIfAllowed,
  deleteSlotIfAllowed,
};
