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
} = require("../validations/adminValidation");

const {
  getUnverifiedPlayrooms,
  getAllUsers,
  verifyPlayroom,
  rejectPlayroom,
  resendVerificationEmail,
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

module.exports = router;
