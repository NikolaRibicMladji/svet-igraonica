const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const {
  createBookingSchema,
  createGuestBookingSchema,
  bookingIdParamSchema,
} = require("../validations/bookingValidation");

const {
  createBooking,
  createGuestBooking,
  getMyBookings,
  getOwnerBookings,
  cancelBooking,

  getBookingById,
} = require("../controllers/bookingController");

// gost: registracija + login + rezervacija
router.post("/guest", validate(createGuestBookingSchema), createGuestBooking);

// ulogovan roditelj: standardna rezervacija
router.post("/", protect, validate(createBookingSchema), createBooking);

// sve ispod traži login
router.use(protect);

router.get("/my", getMyBookings);
router.get("/owner", getOwnerBookings);

router.get("/:id", validate(bookingIdParamSchema), getBookingById);

router.put("/:id/cancel", validate(bookingIdParamSchema), cancelBooking);

module.exports = router;
