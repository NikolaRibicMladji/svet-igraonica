const mongoose = require("mongoose");

const RefreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedByTokenHash: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  },
);

RefreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshSessionSchema.index({ userId: 1, revokedAt: 1, createdAt: -1 });

module.exports = mongoose.model("RefreshSession", RefreshSessionSchema);
