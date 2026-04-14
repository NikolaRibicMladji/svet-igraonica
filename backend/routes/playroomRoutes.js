const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const checkOwner = require("../middleware/ownerMiddleware");
const ROLES = require("../constants/roles");

const {
  createPlayroom,
  getAllPlayrooms,
  getPlayroomById,
  getMyPlayrooms,
  updatePlayroom,
  deletePlayroom,
  verifyPlayroom,
  regenerateTimeSlots,
  getOwnerStats,
  getFilterCities,
} = require("../controllers/playroomController");

// 🌐 JAVNE RUTE
router.get("/", getAllPlayrooms);
router.get("/filter-cities", getFilterCities);

// 🔒 PRIVATNE - vlasnik
router.get(
  "/mine/my-playrooms",
  protect,
  authorize(ROLES.VLASNIK),
  getMyPlayrooms,
);

router.get(
  "/:id/stats",
  protect,
  authorize(ROLES.VLASNIK),
  checkOwner,
  getOwnerStats,
);

// ⚠️ MORA POSLE SPECIFIČNIH
router.get("/:id", getPlayroomById);

// ✏️ CRUD
router.post("/", protect, authorize(ROLES.VLASNIK), createPlayroom);

router.put(
  "/:id",
  protect,
  authorize(ROLES.VLASNIK),
  checkOwner,
  updatePlayroom,
);

router.delete(
  "/:id",
  protect,
  authorize(ROLES.VLASNIK),
  checkOwner,
  deletePlayroom,
);

router.post(
  "/:id/regenerate-slots",
  protect,
  authorize(ROLES.VLASNIK),
  checkOwner,
  regenerateTimeSlots,
);

// 👑 ADMIN
router.put("/:id/verify", protect, authorize(ROLES.ADMIN), verifyPlayroom);

module.exports = router;
