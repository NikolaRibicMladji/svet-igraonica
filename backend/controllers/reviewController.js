const Review = require("../models/Review");
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const ROLES = require("../constants/roles");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");

const ensurePublicPlayroom = (playroom) => {
  if (!playroom) {
    throw new ErrorResponse("Igraonica nije pronađena", 404);
  }

  if (!playroom.verifikovan || playroom.status !== PLAYROOM_STATUS.AKTIVAN) {
    throw new ErrorResponse("Igraonica nije javno dostupna", 403);
  }
};

const recalculatePlayroomRating = async (playroomId) => {
  const result = await Review.aggregate([
    { $match: { playroomId: new mongoose.Types.ObjectId(playroomId) } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgRating =
    result.length > 0 ? Number((result[0].avg || 0).toFixed(1)) : 0;

  const reviewCount = result.length > 0 ? result[0].count || 0 : 0;

  await Playroom.findByIdAndUpdate(
    playroomId,
    {
      $set: {
        rating: avgRating,
        reviewCount,
      },
    },
    { runValidators: true },
  );
};

// @desc    Dodaj recenziju za igraonicu
// @route   POST /api/reviews/:playroomId
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    const { playroomId } = req.validated.params;
    const { rating, comment } = req.validated.body;
    const userId = req.user.id;

    const playroom = await Playroom.findById(playroomId)
      .select("_id verifikovan status")
      .lean();

    ensurePublicPlayroom(playroom);

    const existingReview = await Review.exists({ playroomId, userId });

    if (existingReview) {
      throw new ErrorResponse(
        "Već ste ostavili recenziju za ovu igraonicu",
        409,
      );
    }

    if (req.user.role !== ROLES.ADMIN) {
      const hasCompletedBooking = await Booking.exists({
        playroomId,
        roditeljId: userId,
        status: BOOKING_STATUS.ZAVRSENO,
      });

      if (!hasCompletedBooking) {
        throw new ErrorResponse(
          "Samo roditelji koji su posetili igraonicu mogu ostaviti recenziju. Rezervacija mora biti završena.",
          403,
        );
      }
    }

    const userName =
      `${req.user.ime || ""} ${req.user.prezime || ""}`.trim() || "Korisnik";

    let review;

    try {
      review = await Review.create({
        playroomId,
        userId,
        userName,
        rating,
        comment: comment || "",
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ErrorResponse(
          "Već ste ostavili recenziju za ovu igraonicu",
          409,
        );
      }

      throw error;
    }

    await recalculatePlayroomRating(playroomId);

    return res.status(201).json({
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
    const { playroomId } = req.validated.params;
    const { page, limit } = req.validated.query;

    const playroom = await Playroom.findById(playroomId)
      .select("_id verifikovan status")
      .lean();

    ensurePublicPlayroom(playroom);

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ playroomId })
        .select("userName rating comment createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Review.countDocuments({ playroomId }),
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obriši recenziju
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.validated.params;

    const review = await Review.findById(id);

    if (!review) {
      throw new ErrorResponse("Recenzija nije pronađena", 404);
    }

    if (
      review.userId.toString() !== req.user.id &&
      req.user.role !== ROLES.ADMIN
    ) {
      throw new ErrorResponse("Nemate pravo da obrišete ovu recenziju", 403);
    }

    const playroomId = review.playroomId;

    await review.deleteOne();
    await recalculatePlayroomRating(playroomId);

    return res.status(200).json({
      success: true,
      message: "Recenzija je obrisana",
    });
  } catch (error) {
    next(error);
  }
};
