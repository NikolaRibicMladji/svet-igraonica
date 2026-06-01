const mongoose = require("mongoose");
const ROLES = require("../constants/roles");

const TARGET_ROLES = Object.freeze({
  SVI: "svi",
  VLASNIK: ROLES.VLASNIK,
  RODITELJ: ROLES.RODITELJ,
});

const TARGET_TYPES = Object.freeze({
  ROLE: "role",
  PLAYROOM: "playroom",
  USER: "user",
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

    targetType: {
      type: String,
      enum: Object.values(TARGET_TYPES),
      default: TARGET_TYPES.ROLE,
      required: true,
      index: true,
    },

    targetRole: {
      type: String,
      enum: Object.values(TARGET_ROLES),
      required: [true, "Primaoci obaveštenja su obavezni"],
      index: true,
    },

    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    targetPlayroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playroom",
      default: null,
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
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

NotificationSchema.pre("validate", function (next) {
  if (this.targetType === TARGET_TYPES.PLAYROOM) {
    if (!this.targetPlayroomId) {
      this.invalidate(
        "targetPlayroomId",
        "Igraonica je obavezna za ciljano obaveštenje.",
      );
    }

    if (!this.targetUserId) {
      this.invalidate(
        "targetUserId",
        "Vlasnik igraonice je obavezan za ciljano obaveštenje.",
      );
    }

    if (this.targetRole !== ROLES.VLASNIK) {
      this.invalidate(
        "targetRole",
        "Ciljano obaveštenje za igraonicu može biti poslato samo vlasniku.",
      );
    }
  }

  if (this.targetType === TARGET_TYPES.USER) {
    if (!this.targetUserId) {
      this.invalidate(
        "targetUserId",
        "Korisnik je obavezan za privatno obaveštenje.",
      );
    }

    if (!this.targetRole || this.targetRole === TARGET_ROLES.SVI) {
      this.invalidate(
        "targetRole",
        "Privatno obaveštenje mora imati konkretnu korisničku rolu.",
      );
    }

    this.targetPlayroomId = null;
  }

  if (this.targetType === TARGET_TYPES.ROLE) {
    this.targetUserId = null;
    this.targetPlayroomId = null;
  }

  next();
});

NotificationSchema.index({
  targetRole: 1,
  active: 1,
  publishedAt: -1,
});

NotificationSchema.index({
  targetUserId: 1,
  active: 1,
  publishedAt: -1,
});

NotificationSchema.index({
  targetPlayroomId: 1,
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
module.exports.TARGET_TYPES = TARGET_TYPES;
module.exports.NOTIFICATION_PRIORITIES = NOTIFICATION_PRIORITIES;
