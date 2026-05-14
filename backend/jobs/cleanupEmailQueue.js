const cron = require("node-cron");
const EmailQueue = require("../models/EmailQueue");

const cleanupEmailQueue = async () => {
  try {
    const now = Date.now();

    const sentOlderThan30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const failedOlderThan90Days = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const sentResult = await EmailQueue.deleteMany({
      status: "sent",
      sentAt: { $lte: sentOlderThan30Days },
    });

    const failedResult = await EmailQueue.deleteMany({
      status: "failed",
      updatedAt: { $lte: failedOlderThan90Days },
      attempts: { $gte: 5 },
    });

    console.log("🧹 Email queue cleanup:", {
      deletedSent: sentResult.deletedCount,
      deletedFailed: failedResult.deletedCount,
    });
  } catch (error) {
    console.error("❌ Email queue cleanup error:", error.message);
  }
};

cron.schedule("0 3 * * *", cleanupEmailQueue, {
  timezone: "Europe/Belgrade",
});

console.log("🧹 Email queue cleanup job pokrenut");

module.exports = cleanupEmailQueue;
