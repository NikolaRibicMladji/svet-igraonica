const mongoose = require("mongoose");

const TimeSlotSchema = new mongoose.Schema({
  playroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playroom",
    required: true,
  },
  datum: {
    type: Date,
    required: [true, "Datum je obavezan"],
  },
  vremeOd: {
    type: String,
    required: [true, "Vreme od je obavezno"],
  },
  vremeDo: {
    type: String,
    required: [true, "Vreme do je obavezno"],
  },
  maxDece: {
    type: Number,
    default: 20,
  },
  slobodno: {
    type: Number,
    default: 20,
  },
  zauzeto: {
    type: Boolean,
    default: false,
  },
  aktivno: {
    type: Boolean,
    default: true,
  },
  cena: {
    type: Number,
    required: [true, "Cena je obavezna"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

TimeSlotSchema.index(
  { playroomId: 1, datum: 1, vremeOd: 1, vremeDo: 1 },
  { unique: true },
);

module.exports = mongoose.model("TimeSlot", TimeSlotSchema);
