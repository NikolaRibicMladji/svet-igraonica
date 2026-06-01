const mongoose = require("mongoose");
const ROLES = require("../constants/roles");

const TARGET_ROLES = Object.freeze({
  SVI: "svi",
  ADMIN: ROLES.ADMIN,
  VLASNIK: ROLES.VLASNIK,
  RODITELJ: ROLES.RODITELJ,
});

const NOTIFICATION_PRIORITIES = Object.freeze({
  INFO: "info",
  VAZNO: "vazno",
  HITNO: "hitno",
});

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Naslov obaveštenja je obavezan"],
      trim: true,
      minlength: [3, "Naslov mora imati bar 3 karaktera"],
      maxlength: [120, "Naslov može imati najviše 120 karaktera"],
    },

    message: {
      type: String,
      required: [true, "Tekst obaveštenja je obavezan"],
      trim: true,
      minlength: [5, "Tekst mora imati bar 5 karaktera"],
      maxlength: [3000, "Tekst može imati najviše 3000 karaktera"],
    },

    targetRole: {
      type: String,
      enum: Object.values(TARGET_ROLES),
      required: [true, "Primaoci obaveštenja su obavezni"],
      index: true,
    },

    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITIES),
      default: NOTIFICATION_PRIORITIES.INFO,
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin koji je kreirao obaveštenje je obavezan"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

NotificationSchema.index({
  targetRole: 1,
  active: 1,
  publishedAt: -1,
});

NotificationSchema.index({
  active: 1,
  expiresAt: 1,
});

NotificationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Notification", NotificationSchema);
module.exports.TARGET_ROLES = TARGET_ROLES;
module.exports.NOTIFICATION_PRIORITIES = NOTIFICATION_PRIORITIES;
