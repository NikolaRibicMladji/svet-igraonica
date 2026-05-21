const mongoose = require("mongoose");

const BookingDayLockSchema = new mongoose.Schema(
  {
    playroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playroom",
      required: true,
    },
    datum: {
      type: Date,
      required: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

BookingDayLockSchema.index({ playroomId: 1, datum: 1 }, { unique: true });

module.exports = mongoose.model("BookingDayLock", BookingDayLockSchema);
