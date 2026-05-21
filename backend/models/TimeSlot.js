const mongoose = require("mongoose");

const TIME_REGEX = /^([01]\d|2[0-3]):(00|15|30|45)$/;

const timeToMinutes = (time) => {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
};

const TimeSlotSchema = new mongoose.Schema(
  {
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
      trim: true,
      match: [
        TIME_REGEX,
        "Vreme od mora biti u formatu HH:mm i na 00/15/30/45",
      ],
    },

    vremeDo: {
      type: String,
      required: [true, "Vreme do je obavezno"],
      trim: true,
      match: [
        TIME_REGEX,
        "Vreme do mora biti u formatu HH:mm i na 00/15/30/45",
      ],
      validate: {
        validator: function (value) {
          if (!this.vremeOd || !value) return true;
          return timeToMinutes(value) > timeToMinutes(this.vremeOd);
        },
        message: "Vreme do mora biti posle vremena od",
      },
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
      min: 0,
    },

    vanRadnogVremena: {
      type: Boolean,
      default: false,
    },

    napomenaAdmin: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

TimeSlotSchema.index(
  { playroomId: 1, datum: 1, vremeOd: 1, vremeDo: 1 },
  { unique: true },
);

TimeSlotSchema.index({
  playroomId: 1,
  datum: 1,
  aktivno: 1,
  vanRadnogVremena: 1,
});

TimeSlotSchema.index({
  playroomId: 1,
  datum: 1,
  zauzeto: 1,
});

module.exports = mongoose.model("TimeSlot", TimeSlotSchema);
