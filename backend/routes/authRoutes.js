const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// VALIDACIJA
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
} = require("../validations/authValidation");

// 🌐 JAVNE RUTE
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

// 🔒 PRIVATNE RUTE
router.get("/me", protect, getMe);

module.exports = router;
