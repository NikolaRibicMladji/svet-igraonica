const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    playroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playroom",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Ocena mora biti ceo broj",
      },
      index: true,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

// 🔒 jedan user = jedna recenzija po igraonici
ReviewSchema.index({ playroomId: 1, userId: 1 }, { unique: true });

// ⚡ brži fetch recenzija po datumu
ReviewSchema.index({ playroomId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", ReviewSchema);
