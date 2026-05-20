const express = require("express");
const router = express.Router();
const authorize = require("../middleware/roleMiddleware");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const ROLES = require("../constants/roles");

const {
  createBookingSchema,
  createGuestBookingSchema,
  bookingIdParamSchema,
  bookingListQuerySchema,
} = require("../validations/bookingValidation");

const {
  createBooking,
  createGuestBooking,
  getMyBookings,
  getOwnerBookings,
  cancelBooking,
  confirmBooking,
  getBookingById,
} = require("../controllers/bookingController");

// gost: registracija + login + rezervacija
router.post("/guest", validate(createGuestBookingSchema), createGuestBooking);

// ulogovan roditelj: standardna rezervacija
router.post("/", protect, validate(createBookingSchema), createBooking);

// sve ispod traži login
router.use(protect);

router.get(
  "/my",
  authorize(ROLES.RODITELJ),
  validate(bookingListQuerySchema),
  getMyBookings,
);

router.get(
  "/owner",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(bookingListQuerySchema),
  getOwnerBookings,
);

router.put("/:id/cancel", validate(bookingIdParamSchema), cancelBooking);

router.put(
  "/:id/confirm",
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(bookingIdParamSchema),
  confirmBooking,
);

router.get("/:id", validate(bookingIdParamSchema), getBookingById);

module.exports = router;
