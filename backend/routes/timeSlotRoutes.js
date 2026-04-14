const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
  createTimeSlot,
  getTimeSlotsByPlayroom,
  getTimeSlotById,
  getMyTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
  generateSlotsForPlayroom,
  getAvailableTimeSlots,
  getAllTimeSlotsForOwner,
  manualBookTimeSlot,
  manualBookInterval,
} = require("../controllers/timeSlotController");

const validate = require("../middleware/validate");
const {
  createTimeSlotSchema,
  updateTimeSlotSchema,
  manualBookTimeSlotSchema,
  playroomDateQuerySchema,
  timeSlotIdParamSchema,
} = require("../validations/timeSlotValidation");

const { manualBookingSchema } = require("../validations/bookingValidation");

router.post(
  "/manual-book-interval",
  protect,
  validate(manualBookingSchema),
  manualBookInterval,
);

// 🌐 JAVNE RUTE
router.get(
  "/playroom/:playroomId",
  validate(playroomDateQuerySchema),
  getTimeSlotsByPlayroom,
);

router.get(
  "/playroom/:playroomId/available",
  validate(playroomDateQuerySchema),
  getAvailableTimeSlots,
);

router.get("/:id", validate(timeSlotIdParamSchema), getTimeSlotById);

// 🔒 sve ispod traži login
router.use(protect);

// 👤 vlasnik/admin
router.post(
  "/",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(createTimeSlotSchema),
  createTimeSlot,
);
router.get("/my", authorize(ROLES.VLASNIK, ROLES.ADMIN), getMyTimeSlots);
router.post(
  "/generate/:playroomId",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  generateSlotsForPlayroom,
);
router.put(
  "/:id",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(updateTimeSlotSchema),
  updateTimeSlot,
);
router.delete(
  "/:id",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(timeSlotIdParamSchema),
  deleteTimeSlot,
);

router.get(
  "/playroom/:playroomId/all",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(playroomDateQuerySchema),
  getAllTimeSlotsForOwner,
);

router.post(
  "/:id/manual-book",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(manualBookTimeSlotSchema),
  manualBookTimeSlot,
);

module.exports = router;
