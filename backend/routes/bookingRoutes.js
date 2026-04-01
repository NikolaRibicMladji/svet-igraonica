const validate = require("../middleware/validateMiddleware");
const { createBookingSchema } = require("../validations/bookingValidation");
const express = require("express");
const router = express.Router();
const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const { protect } = require("../middleware/authMiddleware");
const {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  cancelBooking,
  confirmBooking,
  getBookingById,
} = require("../controllers/bookingController");

// Javna ruta - svi mogu da rezervišu
router.post("/", validate(createBookingSchema), createBooking);

// Sve ostale rute traže prijavu
router.use(protect);

router.put("/:id/cancel", protect, cancelBooking);
router.put("/:id/confirm", protect, confirmBooking);

router.get("/my", getMyBookings);
router.get("/owner", getOwnerBookings);
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);
router.put("/:id/confirm", confirmBooking);

module.exports = router;
