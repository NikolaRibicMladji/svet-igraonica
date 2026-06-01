const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const {
  adminPlayroomIdParamSchema,
  rejectPlayroomSchema,
  adminUsersQuerySchema,
  createAdminNotificationSchema,
  adminNotificationsQuerySchema,
  adminNotificationIdParamSchema,
} = require("../validations/adminValidation");

const {
  getUnverifiedPlayrooms,
  getAllUsers,
  verifyPlayroom,
  rejectPlayroom,
  resendVerificationEmail,
  createNotification,
  getAdminNotifications,
  deactivateNotification,
} = require("../controllers/adminController");

// 🔒 sve rute su zaštićene + samo ADMIN
router.use(protect);
router.use(authorize(ROLES.ADMIN));

// 📦 PLAYROOMS
router.get("/playrooms/unverified", getUnverifiedPlayrooms);

router.put(
  "/playrooms/:id/verify",
  validate(adminPlayroomIdParamSchema),
  verifyPlayroom,
);

router.put(
  "/playrooms/:id/reject",
  validate(rejectPlayroomSchema),
  rejectPlayroom,
);

router.post(
  "/playrooms/:id/resend-verification-email",
  validate(adminPlayroomIdParamSchema),
  resendVerificationEmail,
);

// 👤 USERS
router.get("/users", validate(adminUsersQuerySchema), getAllUsers);

// 🔔 NOTIFICATIONS
router.get(
  "/notifications",
  validate(adminNotificationsQuerySchema),
  getAdminNotifications,
);

router.post(
  "/notifications",
  validate(createAdminNotificationSchema),
  createNotification,
);

router.put(
  "/notifications/:id/deactivate",
  validate(adminNotificationIdParamSchema),
  deactivateNotification,
);

module.exports = router;
