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

// Javna ruta - SVI MOGU DA REZERVIŠU
router.post("/", createBooking);

// Sve rute zahtevaju prijavu
router.use(protect);

router.get("/my", getMyBookings);
router.get("/owner", getOwnerBookings);
router.put("/:id/cancel", cancelBooking);
router.put("/:id/confirm", confirmBooking);

module.exports = router;
