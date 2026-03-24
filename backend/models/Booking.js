const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  roditeljId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
