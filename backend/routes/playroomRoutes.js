const express = require("express");
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
router.post("/", protect, vlasnik, createPlayroom);
router.put("/:id", protect, updatePlayroom);
router.delete("/:id", protect, deletePlayroom);

// ADMIN RUTA
router.put("/:id/verify", protect, admin, verifyPlayroom);

module.exports = router;
