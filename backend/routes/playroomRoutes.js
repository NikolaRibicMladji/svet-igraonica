const express = require("express");
const authorize = require("../middleware/roleMiddleware");
const checkOwner = require("../middleware/ownerMiddleware");
const ROLES = require("../constants/roles");
const router = express.Router();
const {
  createPlayroom,
  getAllPlayrooms,
  getPlayroomById,
  getMyPlayrooms,
  updatePlayroom,
  deletePlayroom,
  verifyPlayroom,
} = require("../controllers/playroomController");
const playroomController = require("../controllers/playroomController");
const { protect, vlasnik, admin } = require("../middleware/authMiddleware");

// JAVNE RUTE
router.get("/", getAllPlayrooms);

// PRIVATNE / SPECIFIČNE RUTE
router.get("/mine/my-playrooms", protect, vlasnik, getMyPlayrooms);
router.get("/:id/stats", protect, playroomController.getOwnerStats);

// JAVNA DINAMIČKA RUTA - MORA POSLE SPECIFIČNIH
router.get("/:id", getPlayroomById);

// PRIVATNE CRUD RUTE
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

// ADMIN RUTA
router.put("/:id/verify", protect, admin, verifyPlayroom);

module.exports = router;
