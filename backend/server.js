const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const app = require("./app");

// Load env
dotenv.config({ path: path.join(__dirname, "../.env") });

const requiredEnv = ["MONGO_URI", "JWT_SECRET", "REFRESH_TOKEN_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Nedostaje obavezna ENV promenljiva: ${key}`);
    process.exit(1);
  }
}

// Connect DB
connectDB();

// Cron (ne u testu)
if (process.env.NODE_ENV !== "test") {
  require("./jobs/completeBookings");
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server pokrenut na portu ${PORT} u ${
      process.env.NODE_ENV || "development"
    } modu`,
  );
});

// 🔥 GRACEFUL SHUTDOWN (production must-have)
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err.message);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err.message);
  process.exit(1);
});
