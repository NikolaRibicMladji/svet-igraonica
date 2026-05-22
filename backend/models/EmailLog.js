const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
      index: true,
    },

    error: {
      type: String,
      default: null,
      maxlength: 2000,
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

emailLogSchema.index({ type: 1, status: 1, createdAt: -1 });
emailLogSchema.index({ bookingId: 1, createdAt: -1 });
emailLogSchema.index({ playroomId: 1, createdAt: -1 });
emailLogSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);
