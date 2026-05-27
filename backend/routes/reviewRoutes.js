const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const ROLES = require("../constants/roles");

const {
  addReview,
  getReviews,
  deleteReview,
  getMyReviewStatus,
} = require("../controllers/reviewController");

const {
  addReviewSchema,
  getReviewsSchema,
  deleteReviewSchema,
  getMyReviewStatusSchema,
} = require("../validations/reviewValidation");

// 🔒 PRIVATNO
router.get(
  "/:playroomId/my-status",
  protect,
  authorize(ROLES.RODITELJ, ROLES.ADMIN),
  validate(getMyReviewStatusSchema),
  getMyReviewStatus,
);

// 🌐 JAVNO
router.get("/:playroomId", validate(getReviewsSchema), getReviews);

router.post(
  "/:playroomId",
  protect,
  authorize(ROLES.RODITELJ, ROLES.ADMIN),
  validate(addReviewSchema),
  addReview,
);

router.delete(
  "/:id",
  protect,
  authorize(ROLES.RODITELJ, ROLES.ADMIN),
  validate(deleteReviewSchema),
  deleteReview,
);

module.exports = router;
