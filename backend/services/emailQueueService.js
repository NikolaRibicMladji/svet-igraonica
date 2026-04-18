const emailQueue = require("../queues/emailQueue");

const enqueueBookingEmail = async (bookingId) => {
  await emailQueue.add(
    "send-booking-email",
    { bookingId: String(bookingId) },
    {
      jobId: `booking-email-${bookingId}`,
    },
  );
};

const enqueueBookingCancellationEmail = async (bookingId) => {
  await emailQueue.add(
    "send-booking-cancellation-email",
    { bookingId: String(bookingId) },
    {
      jobId: `booking-cancel-${bookingId}-${Date.now()}`,
    },
  );
};

const enqueueBookingConfirmationEmail = async (bookingId) => {
  await emailQueue.add(
    "send-booking-confirmation-email",
    { bookingId: String(bookingId) },
    {
      jobId: `booking-confirm-${bookingId}-${Date.now()}`,
    },
  );
};

module.exports = {
  enqueueBookingEmail,
  enqueueBookingCancellationEmail,
  enqueueBookingConfirmationEmail,
};
