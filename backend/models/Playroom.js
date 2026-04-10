const mongoose = require("mongoose");
const PLAYROOM_STATUS = require("../constants/playroomStatus");

const dnevnoRadnoVremeSchema = new mongoose.Schema(
  {
    od: {
      type: String,
      default: "",
      trim: true,
    },
    do: {
      type: String,
      default: "",
      trim: true,
    },
    radi: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const stavkaCenovnikaSchema = new mongoose.Schema({
  naziv: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  cena: {
    type: Number,
    required: true,
    min: 0,
  },
  tip: {
    type: String,
    enum: ["fiksno", "po_osobi", "po_satu"],
    default: "fiksno",
  },

  opis: {
    type: String,
    default: "",
    trim: true,
    maxlength: 500,
  },
});

const paketSchema = new mongoose.Schema({
  naziv: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  cena: {
    type: Number,
    required: true,
    min: 0,
  },

  tip: {
    type: String,
    enum: ["fiksno", "po_osobi", "po_satu"],
    default: "fiksno",
  },

  opis: {
    type: String,
    default: "",
    trim: true,
    maxlength: 500,
  },
});

const dodatnaUslugaSchema = new mongoose.Schema({
  naziv: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  cena: {
    type: Number,
    required: true,
    min: 0,
  },
  opis: {
    type: String,
    default: "",
    trim: true,
    maxlength: 500,
  },
  tip: {
    type: String,
    enum: ["po_osobi", "fiksno", "po_satu"],
    default: "fiksno",
  },
});

const slikaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    width: Number,
    height: Number,
    size: Number,
    format: String,
  },
  { _id: false },
);

const videoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    naziv: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    trajanje: {
      type: Number,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const PlayroomSchema = new mongoose.Schema(
  {
    vlasnikId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    naziv: {
      type: String,
      required: [true, "Naziv igraonice je obavezan"],
      trim: true,
      unique: true,
      maxlength: 150,
    },

    adresa: {
      type: String,
      required: [true, "Adresa je obavezna"],
      trim: true,
      maxlength: 200,
    },

    grad: {
      type: String,
      required: [true, "Grad je obavezan"],
      trim: true,
      maxlength: 100,
      index: true,
    },

    opis: {
      type: String,
      required: [true, "Opis je obavezan"],
      trim: true,
      maxlength: 3000,
    },

    kontaktTelefon: {
      type: String,
      required: [true, "Kontakt telefon je obavezan"],
      trim: true,
      maxlength: 30,
    },

    kontaktEmail: {
      type: String,
      required: [true, "Kontakt email je obavezan"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Kontakt email nije validan"],
    },

    radnoVreme: {
      ponedeljak: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
      utorak: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
      sreda: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
      cetvrtak: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
      petak: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
      subota: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
      nedelja: { type: dnevnoRadnoVremeSchema, default: () => ({}) },
    },

    kapacitet: {
      deca: {
        type: Number,
        default: 0,
        min: 0,
      },
      roditelji: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    cene: {
      type: [stavkaCenovnikaSchema],
      default: [],
    },

    paketi: {
      type: [paketSchema],
      default: [],
    },

    dodatneUsluge: {
      type: [dodatnaUslugaSchema],
      default: [],
    },

    besplatnePogodnosti: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
      default: [],
    },

    profilnaSlika: {
      url: {
        type: String,
        default: "",
        trim: true,
      },
      publicId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    slike: {
      type: [slikaSchema],
      default: [],
    },

    videoGalerija: {
      type: [videoSchema],
      default: [],
    },

    verifikovan: {
      type: Boolean,
      default: false,
      index: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(PLAYROOM_STATUS),
      default: PLAYROOM_STATUS.U_IZRADI,
      index: true,
    },

    drustveneMreze: {
      instagram: { type: String, default: "", trim: true },
      facebook: { type: String, default: "", trim: true },
      tiktok: { type: String, default: "", trim: true },
      website: { type: String, default: "", trim: true },
    },
  },
  {
    timestamps: true,
  },
);

PlayroomSchema.index({ grad: 1, status: 1, verifikovan: 1 });

PlayroomSchema.index({ rating: -1, reviewCount: -1 });

PlayroomSchema.index({ vlasnikId: 1, createdAt: -1 });

PlayroomSchema.index({ verifikovan: 1, status: 1, grad: 1 });

PlayroomSchema.index({ status: 1, verifikovan: 1, rating: -1 });

module.exports = mongoose.model("Playroom", PlayroomSchema);
