const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email je obavezan"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Lozinka je obavezna"],
    minlength: 6,
  },
  ime: {
    type: String,
    required: [true, "Ime je obavezno"],
    trim: true,
  },
  prezime: {
    type: String,
    required: [true, "Prezime je obavezno"],
    trim: true,
  },
  telefon: {
    type: String,
    required: [true, "Telefon je obavezan"],
  },
  role: {
    type: String,
    enum: ["roditelj", "vlasnik", "admin"],
    default: "roditelj",
  },
  deca: [
    {
      ime: String,
      godiste: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// NEMA pre('save') middleware-a! Šifrovanje se radi u controller-u.

module.exports = mongoose.model("User", UserSchema);
