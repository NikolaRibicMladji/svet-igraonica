const Notification = require("../models/Notification");
const NotificationRead = require("../models/NotificationRead");
const ErrorResponse = require("../utils/errorResponse");
const { getNowInAppTimezone } = require("../utils/dateTime");

const buildUserNotificationFilter = (
  userRole,
  now = getNowInAppTimezone(),
) => ({
  active: true,
  publishedAt: { $lte: now },
  $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  targetRole: { $in: ["svi", userRole] },
});

const getReadNotificationIds = async (userId) => {
  return NotificationRead.find({ userId }).distinct("notificationId");
};

// @desc    Dohvati moja obaveštenja
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, unreadOnly } = req.validated.query;

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const readIds = await getReadNotificationIds(req.user.id);

    const filter = buildUserNotificationFilter(req.user.role);

    if (unreadOnly) {
      filter._id = { $nin: readIds };
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ priority: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Notification.countDocuments(filter),
    ]);

    const readIdSet = new Set(readIds.map((id) => String(id)));

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
      unreadCount: unreadOnly ? total : undefined,
      data: notifications.map((notification) => ({
        ...notification,
        read: readIdSet.has(String(notification._id)),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Broj nepročitanih obaveštenja
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadNotificationCount = async (req, res, next) => {
  try {
    const filter = buildUserNotificationFilter(req.user.role);

    const notifications = await Notification.find(filter).select("_id").lean();
    const notificationIds = notifications.map((item) => item._id);

    if (notificationIds.length === 0) {
      return res.status(200).json({
        success: true,
        unreadCount: 0,
      });
    }

    const readCount = await NotificationRead.countDocuments({
      userId: req.user.id,
      notificationId: { $in: notificationIds },
    });

    return res.status(200).json({
      success: true,
      unreadCount: Math.max(notificationIds.length - readCount, 0),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Označi jedno obaveštenje kao pročitano
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.validated.params;

    const notification = await Notification.findOne({
      _id: id,
      ...buildUserNotificationFilter(req.user.role),
    }).lean();

    if (!notification) {
      throw new ErrorResponse("Obaveštenje nije pronađeno.", 404);
    }

    await NotificationRead.updateOne(
      {
        notificationId: notification._id,
        userId: req.user.id,
      },
      {
        $setOnInsert: {
          notificationId: notification._id,
          userId: req.user.id,
          readAt: getNowInAppTimezone(),
        },
      },
      {
        upsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Obaveštenje je označeno kao pročitano.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Označi sva moja obaveštenja kao pročitana
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const notifications = await Notification.find(
      buildUserNotificationFilter(req.user.role),
    )
      .select("_id")
      .lean();

    if (notifications.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Nema obaveštenja za označavanje.",
        modifiedCount: 0,
      });
    }

    const now = getNowInAppTimezone();

    const operations = notifications.map((notification) => ({
      updateOne: {
        filter: {
          notificationId: notification._id,
          userId: req.user.id,
        },
        update: {
          $setOnInsert: {
            notificationId: notification._id,
            userId: req.user.id,
            readAt: now,
          },
        },
        upsert: true,
      },
    }));

    const result = await NotificationRead.bulkWrite(operations, {
      ordered: false,
    });

    return res.status(200).json({
      success: true,
      message: "Sva obaveštenja su označena kao pročitana.",
      modifiedCount: result.upsertedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};
