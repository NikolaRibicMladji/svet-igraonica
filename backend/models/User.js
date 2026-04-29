const mongoose = require("mongoose");
const ROLES = require("../constants/roles");

const deteSchema = new mongoose.Schema(
  {
    ime: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    godiste: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email je obavezan"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email nije validan"],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Lozinka je obavezna"],
      minlength: 6,
      select: false,
    },

    ime: {
      type: String,
      required: [true, "Ime je obavezno"],
      trim: true,
      maxlength: 100,
    },

    prezime: {
      type: String,
      required: [true, "Prezime je obavezno"],
      trim: true,
      maxlength: 100,
    },

    telefon: {
      type: String,
      required: [true, "Telefon je obavezan"],
      trim: true,
      maxlength: 30,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },

    acceptedTerms: {
      type: Boolean,
      required: [true, "Prihvatanje uslova korišćenja je obavezno"],
      default: false,
    },

    acceptedTermsAt: {
      type: Date,
      default: null,
    },

    deca: {
      type: [deteSchema],
      default: [],
    },

    passwordResetToken: {
      type: String,
      default: undefined,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// Brzi lookup za login
UserSchema.index({ email: 1 });

// Brži lookup za role-based upite
UserSchema.index({ role: 1 });

// Uklanja sensitive podatke kad se šalje JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;

  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", UserSchema);
