const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "booking_confirmation",
        "booking_owner",
        "booking_cancellation",
        "booking_cancellation_owner",
        "playroom_verification",
        "playroom_approved",
        "playroom_rejected",
      ],
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },

    error: {
      type: String,
      default: null,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    playroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playroom",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("EmailLog", emailLogSchema);