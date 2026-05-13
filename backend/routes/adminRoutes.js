const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../constants/roles");

const {
  getUnverifiedPlayrooms,
  getAllUsers,
  verifyPlayroom,
  rejectPlayroom,
} = require("../controllers/adminController");

// 🔒 sve rute su zaštićene + samo ADMIN
router.use(protect);
router.use(authorize(ROLES.ADMIN));

// 📦 PLAYROOMS
router.get("/playrooms/unverified", getUnverifiedPlayrooms);
router.put("/playrooms/:id/verify", verifyPlayroom);
router.put("/playrooms/:id/reject", rejectPlayroom);

// 👤 USERS
router.get("/users", getAllUsers);

module.exports = router;
