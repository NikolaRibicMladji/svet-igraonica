const cron = require("node-cron");
const Notification = require("../models/Notification");
const NotificationRead = require("../models/NotificationRead");
const logger = require("../utils/logger");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Belgrade";
const READ_RETENTION_DAYS = 45;
const READ_RETENTION_MS = READ_RETENTION_DAYS * 24 * 60 * 60 * 1000;

let isRunning = false;

const cleanupNotifications = async () => {
  if (isRunning) {
    logger.warn("Notification cleanup već radi, preskačem ovaj ciklus");
    return;
  }

  isRunning = true;

  try {
    const cutoffDate = new Date(Date.now() - READ_RETENTION_MS);

    const oldReadDocs = await NotificationRead.find({
      readAt: { $lte: cutoffDate },
    })
      .select("notificationId")
      .lean();

    const notificationIds = [
      ...new Set(oldReadDocs.map((item) => String(item.notificationId))),
    ];

    if (notificationIds.length === 0) {
      logger.info("Notification cleanup završen", {
        deletedNotifications: 0,
        deletedReads: 0,
      });
      return;
    }

    const privateNotifications = await Notification.find({
      _id: { $in: notificationIds },
      targetType: { $in: ["user", "playroom"] },
    })
      .select("_id")
      .lean();

    const privateNotificationIds = privateNotifications.map((item) => item._id);

    if (privateNotificationIds.length === 0) {
      logger.info("Notification cleanup završen", {
        deletedNotifications: 0,
        deletedReads: 0,
      });
      return;
    }

    const [notificationResult, readResult] = await Promise.all([
      Notification.deleteMany({
        _id: { $in: privateNotificationIds },
      }),

      NotificationRead.deleteMany({
        notificationId: { $in: privateNotificationIds },
      }),
    ]);

    logger.info("Notification cleanup završen", {
      deletedNotifications: notificationResult.deletedCount || 0,
      deletedReads: readResult.deletedCount || 0,
    });
  } catch (error) {
    logger.error("Notification cleanup error", {
      message: error.message,
    });
  } finally {
    isRunning = false;
  }
};

cron.schedule("30 3 * * *", cleanupNotifications, {
  timezone: APP_TIMEZONE,
});

logger.info("Notification cleanup job pokrenut", {
  timezone: APP_TIMEZONE,
});

module.exports = cleanupNotifications;
