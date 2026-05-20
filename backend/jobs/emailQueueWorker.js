const cron = require("node-cron");
const EmailQueue = require("../models/EmailQueue");
const EmailLog = require("../models/EmailLog");
const { sendViaResend } = require("../utils/emailService");

let isRunning = false;
let lastRunStartedAt = null;

const getNextRetryDate = (attempts) => {
  const delays = [1, 5, 15, 30, 60];
  const delayMinutes = delays[Math.min(attempts, delays.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000);
};

const processEmailQueue = async () => {
  if (
    isRunning &&
    lastRunStartedAt &&
    Date.now() - lastRunStartedAt < 5 * 60 * 1000
  ) {
    return;
  }
  if (isRunning) return;

  isRunning = true;
  lastRunStartedAt = Date.now();

  try {
    const jobs = await EmailQueue.find({
      status: { $in: ["pending", "failed"] },
      nextRetryAt: { $lte: new Date() },
      attempts: { $lt: 5 },
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    for (const queueJob of jobs) {
      let job = null;

      try {
        job = await EmailQueue.findOneAndUpdate(
          {
            _id: queueJob._id,
            status: { $in: ["pending", "failed"] },
          },
          {
            $set: {
              status: "processing",
            },
            $inc: {
              attempts: 1,
            },
          },
          {
            new: true,
          },
        );

        if (!job) {
          continue;
        }

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
        job.status = job.attempts >= job.maxAttempts ? "failed" : "pending";
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
    lastRunStartedAt = null;
  }
};

cron.schedule("* * * * *", processEmailQueue);
processEmailQueue();

console.log("📨 Email queue worker pokrenut");

module.exports = processEmailQueue;
