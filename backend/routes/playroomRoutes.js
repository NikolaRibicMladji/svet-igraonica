const express = require("express");
const router = express.Router();

const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const checkOwner = require("../middleware/ownerMiddleware");
const ROLES = require("../constants/roles");

const {
  createPlayroomSchema,
  updatePlayroomSchema,
  deactivatePlayroomSchema,
  playroomIdParamSchema,
} = require("../validations/playroomValidation");

const {
  createPlayroom,
  getAllPlayrooms,
  getPlayroomById,
  getMyPlayrooms,
  updatePlayroom,
  deletePlayroom,
  deactivatePlayroom,
  verifyPlayroom,
  regenerateTimeSlots,
  getOwnerStats,
  getFilterCities,
} = require("../controllers/playroomController");

// 🌐 JAVNE RUTE
router.get("/", getAllPlayrooms);
router.get("/filter-cities", getFilterCities);

// 🔒 PRIVATNE - moje igraonice
router.get(
  "/mine/my-playrooms",
  protect,
  authorize(ROLES.VLASNIK),
  getMyPlayrooms,
);

// 📊 Statistika
router.get(
  "/:id/stats",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(playroomIdParamSchema),
  checkOwner,
  getOwnerStats,
);

// ⚠️ Mora posle specifičnih GET ruta
router.get("/:id", validate(playroomIdParamSchema), getPlayroomById);

// ✏️ CRUD
router.post(
  "/",
  protect,
  authorize(ROLES.VLASNIK),
  validate(createPlayroomSchema),
  createPlayroom,
);

router.put(
  "/:id",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(updatePlayroomSchema),
  checkOwner,
  updatePlayroom,
);

router.put(
  "/:id/deactivate",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(deactivatePlayroomSchema),
  checkOwner,
  deactivatePlayroom,
);

router.delete(
  "/:id",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(playroomIdParamSchema),
  checkOwner,
  deletePlayroom,
);

router.post(
  "/:id/regenerate-slots",
  protect,
  authorize(ROLES.VLASNIK, ROLES.ADMIN),
  validate(playroomIdParamSchema),
  checkOwner,
  regenerateTimeSlots,
);

// 👑 ADMIN
router.put(
  "/:id/verify",
  protect,
  authorize(ROLES.ADMIN),
  validate(playroomIdParamSchema),
  verifyPlayroom,
);

module.exports = router;
