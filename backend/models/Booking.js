const mongoose = require("mongoose");
const BOOKING_STATUS = require("../constants/bookingStatus");

const BookingSchema = new mongoose.Schema(
  {
    roditeljId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    playroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playroom",
      required: true,
      index: true,
    },

    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
      index: true,
    },

    datum: {
      type: Date,
      required: true,
      index: true,
    },

    vremeOd: {
      type: String,
      required: true,
    },

    vremeDo: {
      type: String,
      required: true,
    },

    brojDece: {
      type: Number,
      default: 1,
      min: 1,
    },

    brojRoditelja: {
      type: Number,
      default: 0,
      min: 0,
    },

    ukupnaCena: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.CEKANJE,
      index: true,
    },

    napomena: {
      type: String,
      default: "",
      trim: true,
    },

    imeRoditelja: {
      type: String,
      required: true,
      trim: true,
    },

    prezimeRoditelja: {
      type: String,
      required: true,
      trim: true,
    },

    emailRoditelja: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    telefonRoditelja: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// 🔒 Sprečava duple rezervacije za isti slot (osim otkazanih)
BookingSchema.index(
  { timeSlotId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    },
  },
);

module.exports = mongoose.model("Booking", BookingSchema);
