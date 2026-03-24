const mongoose = require("mongoose");

const PlayroomSchema = new mongoose.Schema({
  vlasnikId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  naziv: {
    type: String,
    required: [true, "Naziv igraonice je obavezan"],
    trim: true,
    unique: true,
  },
  adresa: {
    type: String,
    required: [true, "Adresa je obavezna"],
  },
  grad: {
    type: String,
    required: [true, "Grad je obavezan"],
  },
  opis: {
    type: String,
    required: [true, "Opis je obavezan"],
  },
  kontaktTelefon: {
    type: String,
    required: [true, "Kontakt telefon je obavezan"],
  },
  kontaktEmail: {
    type: String,
    required: [true, "Kontakt email je obavezan"],
  },
  radnoVreme: {
    ponedeljak: { od: String, do: String },
    utorak: { od: String, do: String },
    sreda: { od: String, do: String },
    cetvrtak: { od: String, do: String },
    petak: { od: String, do: String },
    subota: { od: String, do: String },
    nedelja: { od: String, do: String },
  },
  cenovnik: {
    osnovni: {
      type: Number,
      required: [true, "Osnovna cena je obavezna"],
    },
    produzeno: Number,
    vikend: Number,
  },
  pogodnosti: [
    {
      type: String,
      enum: [
        "kafic",
        "animatori",
        "parking",
        "wifi",
        "kliziste",
        "trampoline",
        "rođendani",
        "hrana",
      ],
    },
  ],
  slike: [
    {
      type: String,
      default: [],
    },
  ],
  verifikovan: {
    type: Boolean,
    default: false,
  },
  kapacitet: {
    type: Number,
    required: [true, "Kapacitet je obavezan"],
  },
  status: {
    type: String,
    enum: ["aktivan", "neaktivan", "u_izradi"],
    default: "u_izradi",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Playroom", PlayroomSchema);
