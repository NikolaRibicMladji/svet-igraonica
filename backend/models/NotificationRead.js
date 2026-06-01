const mongoose = require("mongoose");

const NotificationReadSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: [true, "ID obaveštenja je obavezan"],
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ID korisnika je obavezan"],
      index: true,
    },

    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

NotificationReadSchema.index(
  {
    notificationId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

NotificationReadSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("NotificationRead", NotificationReadSchema);
