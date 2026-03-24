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
const { protect, vlasnik, admin } = require("../middleware/authMiddleware");

// Javne rute
router.get("/", getAllPlayrooms);
router.get("/:id", getPlayroomById);

// Privatne rute (zahtevaju prijavu)
router.post("/", protect, vlasnik, createPlayroom);
router.get("/mine/my-playrooms", protect, vlasnik, getMyPlayrooms);
router.put("/:id", protect, updatePlayroom);
router.delete("/:id", protect, deletePlayroom);

// Admin rute
router.put("/:id/verify", protect, admin, verifyPlayroom);

module.exports = router;
