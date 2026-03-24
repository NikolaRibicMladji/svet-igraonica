const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Javne rute
router.post("/register", register);
router.post("/login", login);

// Privatne rute (zahtevaju token)
router.get("/me", protect, getMe);

module.exports = router;
