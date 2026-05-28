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
      maxlength: 300,
    },

    html: {
      type: String,
      required: true,
      maxlength: 100000,
    },

    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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
      maxlength: 2000,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

EmailQueueSchema.index({
  status: 1,
  nextRetryAt: 1,
  attempts: 1,
  createdAt: 1,
});

EmailQueueSchema.index(
  { sentAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 30,
    partialFilterExpression: {
      status: "sent",
      sentAt: { $type: "date" },
    },
  },
);

EmailQueueSchema.index({
  status: 1,
  updatedAt: 1,
  attempts: 1,
});

EmailQueueSchema.index(
  {
    bookingId: 1,
    type: 1,
    to: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      bookingId: { $type: "objectId" },
      status: { $in: ["pending", "processing", "sent"] },
    },
  },
);

module.exports = mongoose.model("EmailQueue", EmailQueueSchema);
