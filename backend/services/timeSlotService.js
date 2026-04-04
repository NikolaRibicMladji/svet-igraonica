const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const { lockSlot, unlockSlot } = require("./bookingService");

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
  const hasBooking = await hasActiveBookingForSlot(timeSlot._id);

  if (hasBooking) {
    const error = new Error(
      "Ne možeš deaktivirati termin koji ima rezervaciju",
    );
    error.statusCode = 400;
    throw error;
  }

  timeSlot.aktivno = false;
  await timeSlot.save();

  return timeSlot;
};

const deleteSlotIfAllowed = async (timeSlot) => {
  const hasBooking = await hasActiveBookingForSlot(timeSlot._id);

  if (hasBooking) {
    const error = new Error("Ne možeš obrisati termin koji ima rezervaciju");
    error.statusCode = 400;
    throw error;
  }

  await timeSlot.deleteOne();
  return true;
};

const manualLockSlot = async (slotId) => {
  return lockSlot(slotId);
};

const manualUnlockSlot = async (slotId) => {
  return unlockSlot(slotId);
};

module.exports = {
  findDuplicateSlot,
  hasActiveBookingForSlot,
  deactivateSlotIfAllowed,
  deleteSlotIfAllowed,
  manualLockSlot,
  manualUnlockSlot,
};
