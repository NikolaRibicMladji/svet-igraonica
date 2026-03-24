const express = require("express");
const router = express.Router();
const { protect, vlasnik } = require("../middleware/authMiddleware");
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
} = require("../controllers/timeSlotController");

// Javne rute
router.get("/playroom/:playroomId", getTimeSlotsByPlayroom);
router.get("/playroom/:playroomId/available", getAvailableTimeSlots);
router.get("/:id", getTimeSlotById);

// Privatne rute (zahtevaju prijavu)
router.use(protect);
router.post("/", vlasnik, createTimeSlot);
router.get("/my", vlasnik, getMyTimeSlots);
router.post("/generate/:playroomId", vlasnik, generateSlotsForPlayroom);
router.put("/:id", vlasnik, updateTimeSlot);
router.delete("/:id", vlasnik, deleteTimeSlot);
router.get(
  "/playroom/:playroomId/all",
  protect,
  vlasnik,
  getAllTimeSlotsForOwner,
);
router.post("/:id/manual-book", protect, vlasnik, manualBookTimeSlot);

module.exports = router;
