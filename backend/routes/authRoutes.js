const express = require("express");
const router = express.Router();
const { getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// NOVI IMPORTI ZA VALIDACIJU
const validate = require("../middleware/validateMiddleware");
const {
  registerSchema,
  loginSchema,
} = require("../validations/authValidation");

// Javne rute sa uključenom validacijom
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// Privatne rute
router.get("/me", protect, getMe);

module.exports = router;
