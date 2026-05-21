const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const ErrorResponse = require("../utils/errorResponse");

const findDuplicateSlot = async ({ playroomId, datum, vremeOd, vremeDo }) => {
  return TimeSlot.findOne({
    playroomId,
    datum,
    vremeOd,
    vremeDo,
  }).lean();
};

const hasActiveBookingForSlot = async (timeSlotId) => {
  const existingBooking = await Booking.exists({
    timeSlotId,
    status: { $ne: BOOKING_STATUS.OTKAZANO },
  });

  return Boolean(existingBooking);
};

const deactivateSlotIfAllowed = async (timeSlot) => {
  const hasActiveBooking = await hasActiveBookingForSlot(timeSlot._id);

  if (hasActiveBooking || timeSlot.zauzeto) {
    throw new ErrorResponse(
      "Ne možeš deaktivirati termin koji ima rezervaciju ili je zauzet",
      400,
    );
  }

  const updated = await TimeSlot.findOneAndUpdate(
    {
      _id: timeSlot._id,
      zauzeto: false,
    },
    {
      $set: {
        aktivno: false,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updated) {
    throw new ErrorResponse(
      "Termin je u međuvremenu zauzet i ne može biti deaktiviran",
      409,
    );
  }

  return updated;
};

const deleteSlotIfAllowed = async (timeSlot) => {
  const hasActiveBooking = await hasActiveBookingForSlot(timeSlot._id);

  if (hasActiveBooking || timeSlot.zauzeto) {
    throw new ErrorResponse(
      "Ne možeš obrisati termin koji ima rezervaciju ili je zauzet",
      400,
    );
  }

  const deleted = await TimeSlot.findOneAndDelete({
    _id: timeSlot._id,
    zauzeto: false,
  });

  if (!deleted) {
    throw new ErrorResponse(
      "Termin je u međuvremenu zauzet i ne može biti obrisan",
      409,
    );
  }

  return true;
};

module.exports = {
  findDuplicateSlot,
  hasActiveBookingForSlot,
  deactivateSlotIfAllowed,
  deleteSlotIfAllowed,
};
