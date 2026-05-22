const cron = require("node-cron");
const EmailQueue = require("../models/EmailQueue");
const logger = require("../utils/logger");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Belgrade";

let isRunning = false;

const cleanupEmailQueue = async () => {
  if (isRunning) {
    logger.warn("Email queue cleanup već radi, preskačem ovaj ciklus");
    return;
  }

  isRunning = true;

  try {
    const now = Date.now();

    const sentOlderThan30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const failedOlderThan90Days = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const [sentResult, failedResult] = await Promise.all([
      EmailQueue.deleteMany({
        status: "sent",
        sentAt: { $lte: sentOlderThan30Days },
      }),

      EmailQueue.deleteMany({
        status: "failed",
        updatedAt: { $lte: failedOlderThan90Days },
        attempts: { $gte: 5 },
      }),
    ]);

    logger.info("Email queue cleanup završen", {
      deletedSent: sentResult.deletedCount || 0,
      deletedFailed: failedResult.deletedCount || 0,
    });
  } catch (error) {
    logger.error("Email queue cleanup error", {
      message: error.message,
    });
  } finally {
    isRunning = false;
  }
};

cron.schedule("0 3 * * *", cleanupEmailQueue, {
  timezone: APP_TIMEZONE,
});

logger.info("Email queue cleanup job pokrenut", {
  timezone: APP_TIMEZONE,
});

module.exports = cleanupEmailQueue;
