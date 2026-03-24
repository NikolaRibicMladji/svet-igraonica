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
  zauzeto: {
    type: Boolean,
    default: false, // false = slobodno, true = zauzeto
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

module.exports = mongoose.model("TimeSlot", TimeSlotSchema);
