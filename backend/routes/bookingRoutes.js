const express = require("express");
const router = express.Router();
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
router.post("/", createBooking);

// Sve ostale rute traže prijavu
router.use(protect);

router.get("/my", getMyBookings);
router.get("/owner", getOwnerBookings);
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);
router.put("/:id/confirm", confirmBooking);

module.exports = router;
