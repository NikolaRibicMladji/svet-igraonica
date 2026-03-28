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
    ponedeljak: {
      od: String,
      do: String,
      radi: { type: Boolean, default: true },
    },
    utorak: { od: String, do: String, radi: { type: Boolean, default: true } },
    sreda: { od: String, do: String, radi: { type: Boolean, default: true } },
    cetvrtak: {
      od: String,
      do: String,
      radi: { type: Boolean, default: true },
    },
    petak: { od: String, do: String, radi: { type: Boolean, default: true } },
    subota: { od: String, do: String, radi: { type: Boolean, default: true } },
    nedelja: { od: String, do: String, radi: { type: Boolean, default: true } },
  },
  kapacitet: {
    deca: {
      type: Number,
      required: [true, "Kapacitet dece je obavezan"],
    },
    roditelji: {
      type: Number,
      default: 0,
    },
  },
  // Osnovna cena (po detetu) - OBAVEZNA
  osnovnaCena: {
    type: Number,
    required: [true, "Osnovna cena je obavezna"],
  },
  // Ostale cene - vlasnik sam dodaje
  cene: [
    {
      naziv: {
        type: String,
        required: true,
      },
      cena: {
        type: Number,
        required: true,
      },
      opis: {
        type: String,
        default: "",
      },
    },
  ],
  // Paketi (npr. Rođendanski paket)
  paketi: [
    {
      naziv: {
        type: String,
        required: true,
      },
      cena: {
        type: Number,
        required: true,
      },
      opis: {
        type: String,
        default: "",
      },
    },
  ],
  // Dodatne usluge (npr. Animator, Tortas)
  dodatneUsluge: [
    {
      naziv: {
        type: String,
        required: true,
      },
      cena: {
        type: Number,
        required: true,
      },
      opis: {
        type: String,
        default: "",
      },
      tip: {
        type: String,
        enum: ["po_osobi", "fiksno"],
        default: "fiksno",
      },
    },
  ],
  // Besplatne pogodnosti (parking, wifi, kafic...)
  besplatnePogodnosti: [
    {
      type: String,
      trim: true,
    },
  ],
  // Slike
  profilnaSlika: {
    url: String,
    publicId: String,
  },
  slike: [
    {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
      width: Number,
      height: Number,
      size: Number,
      format: String,
    },
  ],
  videoGalerija: [
    {
      url: String,
      publicId: String,
      thumbnail: String,
      naziv: String,
      trajanje: Number,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  verifikovan: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["aktivan", "neaktivan", "u_izradi"],
    default: "u_izradi",
  },
  drustveneMreze: {
    instagram: { type: String, default: "", trim: true },
    facebook: { type: String, default: "", trim: true },
    tiktok: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
  },
  cene: [
    {
      naziv: {
        type: String,
        required: true,
      },
      cena: {
        type: Number,
        required: true,
      },
      tip: {
        type: String,
        enum: ["fiksno", "po_osobi"],
        default: "fiksno",
      },
      opis: {
        type: String,
        default: "",
      },
    },
  ],
  cenaRoditelja: {
    tip: {
      type: String,
      enum: ["ne_naplacuje", "fiksno", "po_osobi"],
      default: "ne_naplacuje",
    },
    iznos: {
      type: Number,
      default: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Playroom", PlayroomSchema);
