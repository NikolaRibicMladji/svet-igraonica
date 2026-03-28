const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  roditeljId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    default: null,
  },
  playroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playroom",
    required: true,
  },
  datum: {
    type: Date,
    required: true,
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
  },
  ukupnaCena: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["cekiranje", "potvrdjeno", "otkazano", "zavrseno"],
    default: "potvrdjeno",
  },
  napomena: {
    type: String,
    default: "",
  },
  timeSlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TimeSlot",
  },
  vremeDo: {
    type: String,
    required: true,
  },
  // Dodaj pored postojećih polja
  imeRoditelja: {
    type: String,
    required: true,
  },
  prezimeRoditelja: {
    type: String,
    required: true,
  },
  emailRoditelja: {
    type: String,
    required: true,
  },
  telefonRoditelja: {
    type: String,
    required: true,
  },
  brojRoditelja: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
