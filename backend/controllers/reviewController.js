const Review = require("../models/Review");
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");

const recalculatePlayroomRating = async (playroomId) => {
  const result = await Review.aggregate([
    { $match: { playroomId: new mongoose.Types.ObjectId(playroomId) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (!playroom) return;

  if (allReviews.length > 0) {
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    playroom.rating = Number((totalRating / allReviews.length).toFixed(1));
    playroom.reviewCount = allReviews.length;
  } else {
    playroom.rating = 0;
    playroom.reviewCount = 0;
  }

  await playroom.save();
};

// @desc    Dodaj recenziju za igraonicu
// @route   POST /api/reviews/:playroomId
// @access  Private (samo roditelji koji su bili na terminu)
exports.addReview = async (req, res, next) => {
  try {
    const { playroomId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    const existingReview = await Review.findOne({ playroomId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Već ste ostavili recenziju za ovu igraonicu",
      });
    }

    const hasCompletedBooking = await Booking.findOne({
      playroomId,
      roditeljId: userId,
      status: BOOKING_STATUS.ZAVRSENO,
    });

    if (!hasCompletedBooking && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Samo roditelji koji su posetili igraonicu mogu ostaviti recenziju. Rezervacija mora biti završena.",
      });
    }

    const review = await Review.create({
      playroomId,
      userId,
      userName: `${req.user.ime} ${req.user.prezime}`.trim(),
      rating,
      comment: (comment || "").trim(),
    });

    await recalculatePlayroomRating(playroomId);

    res.status(201).json({
      success: true,
      data: review,
      message: "Recenzija je uspešno dodata",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dohvati sve recenzije za igraonicu
// @route   GET /api/reviews/:playroomId
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    const { playroomId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);

    const playroom = await Playroom.findById(playroomId).select("_id");
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    const reviews = await Review.find({ playroomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ playroomId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obriši recenziju (samo admin ili autor)
// @route   DELETE /api/reviews/:id
// @access  Private (admin ili autor)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Recenzija nije pronađena",
      });
    }

    if (review.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da obrišete ovu recenziju",
      });
    }

    const playroomId = review.playroomId;

    await review.deleteOne();
    await recalculatePlayroomRating(playroomId);

    res.status(200).json({
      success: true,
      message: "Recenzija je obrisana",
    });
  } catch (error) {
    next(error);
  }
};
