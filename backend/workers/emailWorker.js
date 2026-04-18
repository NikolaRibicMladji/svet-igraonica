const { Worker } = require("bullmq");
const redis = require("../config/redis");
const bookingService = require("../services/bookingService");

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    if (job.name === "send-booking-email") {
      await bookingService.handleBookingEmails(job.data.bookingId);
      return;
    }

    if (job.name === "send-booking-cancellation-email") {
      await bookingService.sendCancellationEmailById(job.data.bookingId);
      return;
    }

    if (job.name === "send-booking-confirmation-email") {
      await bookingService.sendConfirmationEmailById(job.data.bookingId);
      return;
    }

    throw new Error(`Nepoznat job tip: ${job.name}`);
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  console.log(`✅ Email job završen: ${job.name} | ${job.id}`);
});

emailWorker.on("failed", (job, err) => {
  console.error(
    `❌ Email job pukao: ${job?.name} | ${job?.id} | ${err.message}`,
  );
});

module.exports = emailWorker;
