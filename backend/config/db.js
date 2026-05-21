const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI nije definisan");
  }

  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  console.log(`✅ MongoDB povezan: ${conn.connection.host}`);

  return conn;
};

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB greška:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB konekcija prekinuta");
});

module.exports = connectDB;
