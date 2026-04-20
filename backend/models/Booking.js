const mongoose = require("mongoose");
const BOOKING_STATUS = require("../constants/bookingStatus");

const BookingSchema = new mongoose.Schema(
  {
    roditeljId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    playroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playroom",
      required: true,
      index: true,
    },

    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      default: null,
      index: true,
    },

    datum: {
      type: Date,
      required: true,
      index: true,
    },

    vremeOd: {
      type: String,
      required: true,
      trim: true,
    },

    vremeDo: {
      type: String,
      required: true,
      trim: true,
    },

    ukupnaCena: {
      type: Number,
      required: true,
      min: 0,
    },

    brojDece: {
      type: Number,
      default: 0,
      min: 0,
    },

    brojRoditelja: {
      type: Number,
      default: 0,
      min: 0,
    },

    izabraneCene: {
      type: [
        {
          naziv: {
            type: String,
            default: "",
            trim: true,
          },
          cena: {
            type: Number,
            default: 0,
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
          },
        },
      ],
      default: [],
    },

    izabraniPaket: {
      type: {
        naziv: {
          type: String,
          default: "",
          trim: true,
        },
        cena: {
          type: Number,
          default: 0,
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
        },
      },
      default: null,
    },

    izabraneUsluge: {
      type: [
        {
          naziv: {
            type: String,
            trim: true,
          },
          cena: {
            type: Number,
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
          },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.POTVRDJENO,
      index: true,
    },

    napomena: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    imeRoditelja: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    prezimeRoditelja: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    emailRoditelja: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email nije validan"],
    },

    telefonRoditelja: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
  },
  {
    timestamps: true,
  },
);

// Sprečava duple aktivne rezervacije za isti slot.
// Otkazana rezervacija ne blokira novi booking.
BookingSchema.index(
  { timeSlotId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      timeSlotId: { $type: "objectId" },
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    },
  },
);
// Sprečava duple aktivne rezervacije za isti vremenski interval (custom booking)
BookingSchema.index(
  { playroomId: 1, datum: 1, vremeOd: 1, vremeDo: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $ne: BOOKING_STATUS.OTKAZANO },
    },
  },
);

// Brži query za owner dashboard
BookingSchema.index({ playroomId: 1, datum: 1 });

// Brži query za korisnik istoriju
BookingSchema.index({ roditeljId: 1, createdAt: -1 });

// Brži query za aktivne rezervacije po danu
BookingSchema.index({ playroomId: 1, datum: 1, status: 1 });

module.exports = mongoose.model("Booking", BookingSchema);
