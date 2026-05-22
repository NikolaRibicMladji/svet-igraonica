const cron = require("node-cron");
const EmailQueue = require("../models/EmailQueue");
const EmailLog = require("../models/EmailLog");
const { sendViaResend } = require("../utils/emailService");
const logger = require("../utils/logger");
const { APP_TIMEZONE } = require("../utils/dateTime");

let isRunning = false;

const MAX_BATCH_SIZE = 10;
const STALE_PROCESSING_MINUTES = 15;

const getNextRetryDate = (attempts) => {
  const delays = [1, 5, 15, 30, 60];
  const delayMinutes = delays[Math.min(attempts, delays.length - 1)];

  return new Date(Date.now() + delayMinutes * 60 * 1000);
};

const normalizeErrorMessage = (error) => {
  return String(error?.message || "Nepoznata email greška").slice(0, 2000);
};

const releaseStaleProcessingJobs = async () => {
  const staleBefore = new Date(
    Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000,
  );

  const result = await EmailQueue.updateMany(
    {
      status: "processing",
      updatedAt: { $lte: staleBefore },
      attempts: { $lt: 5 },
    },
    {
      $set: {
        status: "pending",
        nextRetryAt: new Date(),
      },
    },
    {
      runValidators: true,
    },
  );

  if (result.modifiedCount > 0) {
    logger.warn("Vraćeni zaglavljeni email jobovi u pending", {
      count: result.modifiedCount,
    });
  }
};

const processEmailQueue = async () => {
  if (isRunning) {
    logger.warn("Email queue worker već radi, preskačem ovaj ciklus");
    return;
  }

  isRunning = true;

  try {
    await releaseStaleProcessingJobs();

    const now = new Date();

    const jobs = await EmailQueue.find({
      status: { $in: ["pending", "failed"] },
      nextRetryAt: { $lte: now },
      attempts: { $lt: 5 },
    })
      .sort({ createdAt: 1 })
      .limit(MAX_BATCH_SIZE)
      .select("_id")
      .lean();

    if (!jobs.length) {
      return;
    }

    for (const queueJob of jobs) {
      let job = null;

      try {
        job = await EmailQueue.findOneAndUpdate(
          {
            _id: queueJob._id,
            status: { $in: ["pending", "failed"] },
            nextRetryAt: { $lte: new Date() },
            attempts: { $lt: 5 },
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
            runValidators: true,
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

        logger.info("Queued email poslat", {
          to: job.to,
          type: job.type,
          queueId: job._id,
        });
      } catch (error) {
        const errorMessage = normalizeErrorMessage(error);

        if (!job) {
          logger.error("Email job nije zaključan za obradu", {
            queueId: queueJob._id,
            message: errorMessage,
          });

          continue;
        }

        job.lastError = errorMessage;
        job.status = job.attempts >= job.maxAttempts ? "failed" : "pending";
        job.nextRetryAt = getNextRetryDate(job.attempts);

        await job.save();

        await EmailLog.create({
          to: job.to,
          subject: job.subject,
          type: job.type,
          status: "failed",
          error: errorMessage,
          bookingId: job.bookingId || null,
          playroomId: job.playroomId || null,
        });

        logger.error("Queued email failed", {
          to: job.to,
          type: job.type,
          queueId: job._id,
          attempts: job.attempts,
          status: job.status,
          message: errorMessage,
        });
      }
    }
  } catch (error) {
    logger.error("Email queue worker error", {
      message: normalizeErrorMessage(error),
    });
  } finally {
    isRunning = false;
  }
};

cron.schedule("* * * * *", processEmailQueue, {
  timezone: APP_TIMEZONE,
});

processEmailQueue();

logger.info("Email queue worker pokrenut", {
  interval: "* * * * *",
  timezone: APP_TIMEZONE,
});

module.exports = processEmailQueue;
