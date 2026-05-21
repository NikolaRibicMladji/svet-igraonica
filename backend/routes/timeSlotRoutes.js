const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");
const validate = require("../middleware/validate");

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

const {
  createTimeSlotSchema,
  updateTimeSlotSchema,
  manualBookTimeSlotSchema,
  playroomDateQuerySchema,
  timeSlotIdParamSchema,
  playroomIdParamSchema,
} = require("../validations/timeSlotValidation");

const { manualBookingSchema } = require("../validations/bookingValidation");

// 🌐 JAVNE RUTE
router.get(
  "/playroom/:playroomId/available",
  validate(playroomDateQuerySchema),
  getAvailableTimeSlots,
);

router.get(
  "/playroom/:playroomId",
  validate(playroomDateQuerySchema),
  getTimeSlotsByPlayroom,
);

// 🔒 MOJI TERMINI - mora pre "/:id"
router.get("/my", protect, authorize(ROLES.VLASNIK), getMyTimeSlots);

// 🔒 OWNER/ADMIN - svi slotovi za igraonicu
router.get(
  "/playroom/:playroomId/all",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(playroomDateQuerySchema),
  getAllTimeSlotsForOwner,
);

// 🌐 JAVNI DETALJ TERMINA - mora posle specifičnih ruta
router.get("/:id", validate(timeSlotIdParamSchema), getTimeSlotById);

// 🔒 KREIRANJE TERMINA
router.post(
  "/",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(createTimeSlotSchema),
  createTimeSlot,
);

// 🔒 GENERISANJE TERMINA
router.post(
  "/generate/:playroomId",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(playroomIdParamSchema),
  generateSlotsForPlayroom,
);

// 🔒 AŽURIRANJE TERMINA
router.put(
  "/:id",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(updateTimeSlotSchema),
  updateTimeSlot,
);

// 🔒 BRISANJE TERMINA
router.delete(
  "/:id",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(timeSlotIdParamSchema),
  deleteTimeSlot,
);

// 🔒 RUČNA REZERVACIJA POSTOJEĆEG SLOTA
router.post(
  "/:id/manual-book",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(manualBookTimeSlotSchema),
  manualBookTimeSlot,
);

// 🔒 RUČNA REZERVACIJA INTERVALA
router.post(
  "/manual-book-interval",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(manualBookingSchema),
  manualBookInterval,
);

module.exports = router;
