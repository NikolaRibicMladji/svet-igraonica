const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  cancelBooking,
  confirmBooking,
} = require("../controllers/bookingController");

// Sve rute zahtevaju prijavu
router.use(protect);

router.post("/", createBooking);
router.get("/my", getMyBookings);
router.get("/owner", getOwnerBookings);
router.put("/:id/cancel", cancelBooking);
router.put("/:id/confirm", confirmBooking);

module.exports = router;
