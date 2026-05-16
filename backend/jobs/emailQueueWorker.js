const cron = require("node-cron");
const EmailQueue = require("../models/EmailQueue");
const EmailLog = require("../models/EmailLog");
const { sendViaResend } = require("../utils/emailService");

let isRunning = false;

const getNextRetryDate = (attempts) => {
  const delays = [1, 5, 15, 30, 60];
  const delayMinutes = delays[Math.min(attempts, delays.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000);
};

const processEmailQueue = async () => {
  if (isRunning) return;

  isRunning = true;

  try {
    const jobs = await EmailQueue.find({
      status: { $in: ["pending", "failed"] },
      nextRetryAt: { $lte: new Date() },
      attempts: { $lt: 5 },
    })
      .sort({ createdAt: 1 })
      .limit(10);

    for (const job of jobs) {
      try {
        job.status = "processing";
        job.attempts += 1;
        await job.save();

        await sendViaResend({
          to: job.to,
          subject: job.subject,
          html: job.html,
        });

        job.status = "sent";
        job.sentAt = new Date();
        job.lastError = null;
        await job.save();

        await EmailLog.create({
          to: job.to,
          subject: job.subject,
          type: job.type,
          status: "success",
          bookingId: job.bookingId || null,
          playroomId: job.playroomId || null,
        });

        console.log("✅ QUEUED EMAIL SENT:", job.to);
      } catch (err) {
        job.lastError = err.message;
        job.status = job.attempts >= job.maxAttempts ? "failed" : "failed";
        job.nextRetryAt = getNextRetryDate(job.attempts);
        await job.save();

        await EmailLog.create({
          to: job.to,
          subject: job.subject,
          type: job.type,
          status: "failed",
          error: err.message,
          bookingId: job.bookingId || null,
          playroomId: job.playroomId || null,
        });

        console.error("❌ QUEUED EMAIL FAILED:", job.to, err.message);
      }
    }
  } catch (error) {
    console.error("❌ EMAIL QUEUE WORKER ERROR:", error.message);
  } finally {
    isRunning = false;
  }
};

cron.schedule("* * * * *", processEmailQueue);
processEmailQueue();

console.log("📨 Email queue worker pokrenut");

module.exports = processEmailQueue;
