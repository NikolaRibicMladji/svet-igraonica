const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getUnverifiedPlayrooms,
  getAllUsers,
  verifyPlayroom,
} = require("../controllers/adminController");

// Sve admin rute zahtevaju admin ulogu
router.use(protect, admin);

router.get("/playrooms/unverified", getUnverifiedPlayrooms);
router.get("/users", getAllUsers);
router.put("/playrooms/:id/verify", verifyPlayroom);

module.exports = router;
