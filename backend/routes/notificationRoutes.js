const express = require("express");
const router = express.Router();

const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");

const {
  userNotificationsQuerySchema,
  notificationIdParamSchema,
  emptyNotificationBodySchema,
} = require("../validations/notificationValidation");

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

// Sve notification rute su za ulogovane korisnike
router.use(protect);

router.get("/", validate(userNotificationsQuerySchema), getMyNotifications);

router.get("/unread-count", getUnreadNotificationCount);

router.put(
  "/read-all",
  validate(emptyNotificationBodySchema),
  markAllNotificationsAsRead,
);

router.put(
  "/:id/read",
  validate(notificationIdParamSchema),
  markNotificationAsRead,
);

module.exports = router;
