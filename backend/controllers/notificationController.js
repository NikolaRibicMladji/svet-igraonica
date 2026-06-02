const Notification = require("../models/Notification");
const NotificationRead = require("../models/NotificationRead");
const ErrorResponse = require("../utils/errorResponse");
const { getNowInAppTimezone } = require("../utils/dateTime");

const READ_VISIBLE_FOR_MS = 24 * 60 * 60 * 1000;

const buildUserNotificationFilter = ({
  userId,
  userRole,
  now = getNowInAppTimezone(),
}) => {
  if (userRole === "admin") {
    return {
      _id: { $exists: false },
    };
  }

  const baseFilter = {
    active: true,
    publishedAt: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };

  return {
    ...baseFilter,
    $and: [
      {
        $or: [
          {
            targetType: "role",
            targetRole: { $in: ["svi", userRole] },
          },
          {
            targetType: "playroom",
            targetUserId: userId,
          },
          {
            targetType: "user",
            targetUserId: userId,
          },
        ],
      },
    ],
  };
};

const getReadNotificationDocs = async (userId) => {
  return NotificationRead.find({ userId })
    .select("notificationId readAt")
    .lean();
};

// @desc    Dohvati moja obaveštenja
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, unreadOnly } = req.validated.query;

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const now = getNowInAppTimezone();
    const readDocs = await getReadNotificationDocs(req.user.id);

    const readIds = readDocs.map((item) => item.notificationId);

    const visibleReadIds = readDocs
      .filter((item) => {
        if (!item.readAt) return false;

        const readAt = new Date(item.readAt).getTime();

        if (Number.isNaN(readAt)) return false;

        return now.getTime() - readAt <= READ_VISIBLE_FOR_MS;
      })
      .map((item) => item.notificationId);

    const filter = buildUserNotificationFilter({
      userId: req.user.id,
      userRole: req.user.role,
      now,
    });

    if (unreadOnly) {
      filter._id = { $nin: readIds };
    } else {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ _id: { $nin: readIds } }, { _id: { $in: visibleReadIds } }],
        },
      ];
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
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
    const filter = buildUserNotificationFilter({
      userId: req.user.id,
      userRole: req.user.role,
    });

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
      ...buildUserNotificationFilter({
        userId: req.user.id,
        userRole: req.user.role,
      }),
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
      buildUserNotificationFilter({
        userId: req.user.id,
        userRole: req.user.role,
      }),
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
