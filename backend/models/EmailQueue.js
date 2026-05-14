const mongoose = require("mongoose");

const EmailQueueSchema = new mongoose.Schema(
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
    },

    html: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
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

    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastError: {
      type: String,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

EmailQueueSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model("EmailQueue", EmailQueueSchema);
