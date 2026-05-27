const mongoose = require("mongoose");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const { normalizeText } = require("../utils/normalizeText");

const TIME_REGEX = /^([01]\d|2[0-3]):(00|15|30|45)$/;

const timeToMinutes = (time) => {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
};

const dnevnoRadnoVremeSchema = new mongoose.Schema(
  {
    od: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return TIME_REGEX.test(value);
        },
        message: "Radno vreme od mora biti u formatu HH:mm i na 00/15/30/45",
      },
    },
    do: {
      type: String,
      default: "",
      trim: true,
      validate: [
        {
          validator: function (value) {
            if (!value) return true;
            return TIME_REGEX.test(value);
          },
          message: "Radno vreme do mora biti u formatu HH:mm i na 00/15/30/45",
        },
        {
          validator: function (value) {
            if (!this.od || !value) return true;
            return timeToMinutes(value) > timeToMinutes(this.od);
          },
          message: "Radno vreme do mora biti posle vremena od",
        },
      ],
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
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    width: {
      type: Number,
      default: 0,
      min: 0,
    },

    height: {
      type: Number,
      default: 0,
      min: 0,
    },

    format: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
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

      maxlength: 150,
    },

    adresa: {
      type: String,
      required: [true, "Adresa je obavezna"],
      trim: true,
      maxlength: 200,
    },

    adresaNormalized: {
      type: String,
      default: "",
      trim: true,
      index: true,
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
      unique: true,
      index: true,
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
    rezimRezervacije: {
      type: String,
      enum: ["fleksibilno", "fiksno"],
      required: true,
    },
    trajanjeTermina: {
      type: Number,
      enum: [60, 90, 120, 150, 180, 210, 240, 270, 300],
      default: 60,
    },
    vremePripremeTermina: {
      type: Number,
      enum: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
      default: 0,
    },
    gradNormalized: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    nazivNormalized: {
      type: String,
      default: "",
      trim: true,
      index: true,
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
      validate: [(arr) => arr.length <= 10, "Maksimalno 10 slika"],
      default: [],
    },

    videoGalerija: {
      type: [videoSchema],
      validate: [(arr) => arr.length <= 3, "Maksimalno 3 videa"],
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
    razlogOdbijanja: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    odbijenAt: {
      type: Date,
      default: null,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    drustveneMreze: {
      instagram: {
        type: String,
        default: "",
        trim: true,
        maxlength: 300,
      },

      facebook: {
        type: String,
        default: "",
        trim: true,
        maxlength: 300,
      },

      tiktok: {
        type: String,
        default: "",
        trim: true,
        maxlength: 300,
      },

      website: {
        type: String,
        default: "",
        trim: true,
        maxlength: 300,
      },
    },
  },
  {
    timestamps: true,
  },
);

PlayroomSchema.pre("save", function (next) {
  if (this.isModified("grad")) {
    this.gradNormalized = normalizeText(this.grad);
  }

  if (this.isModified("naziv")) {
    this.nazivNormalized = normalizeText(this.naziv);
  }

  if (this.isModified("adresa")) {
    this.adresaNormalized = normalizeText(this.adresa);
  }

  next();
});

const applyNormalizedFieldsToUpdate = (update = {}) => {
  const $set = update.$set || {};

  const grad = Object.prototype.hasOwnProperty.call($set, "grad")
    ? $set.grad
    : update.grad;

  const naziv = Object.prototype.hasOwnProperty.call($set, "naziv")
    ? $set.naziv
    : update.naziv;

  const adresa = Object.prototype.hasOwnProperty.call($set, "adresa")
    ? $set.adresa
    : update.adresa;

  if (typeof grad === "string") {
    $set.gradNormalized = normalizeText(grad);
  }

  if (typeof naziv === "string") {
    $set.nazivNormalized = normalizeText(naziv);
  }

  if (typeof adresa === "string") {
    $set.adresaNormalized = normalizeText(adresa);
  }

  update.$set = $set;

  return update;
};

PlayroomSchema.pre("findOneAndUpdate", function (next) {
  this.setUpdate(applyNormalizedFieldsToUpdate(this.getUpdate()));
  next();
});

PlayroomSchema.pre("updateOne", function (next) {
  this.setUpdate(applyNormalizedFieldsToUpdate(this.getUpdate()));
  next();
});

// listing + filter po gradu
PlayroomSchema.index({ verifikovan: 1, status: 1, gradNormalized: 1 });

// listing + sortiranje
PlayroomSchema.index({ verifikovan: 1, status: 1, rating: -1, createdAt: -1 });

// owner
PlayroomSchema.index({ vlasnikId: 1, createdAt: -1 });

// search
PlayroomSchema.index({ nazivNormalized: 1 });
PlayroomSchema.index({ gradNormalized: 1 });

PlayroomSchema.index(
  { nazivNormalized: 1, gradNormalized: 1 },
  { unique: true },
);
PlayroomSchema.index(
  { adresaNormalized: 1, gradNormalized: 1 },
  { unique: true },
);

module.exports = mongoose.model("Playroom", PlayroomSchema);
