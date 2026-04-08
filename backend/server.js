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

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    await connectDB();

    // Cron (ne u testu)
    if (process.env.NODE_ENV !== "test") {
      require("./jobs/completeBookings");
    }

    server = app.listen(PORT, () => {
      console.log(
        `🚀 Server pokrenut na portu ${PORT} u ${
          process.env.NODE_ENV || "development"
        } modu`,
      );
    });
  } catch (error) {
    console.error("❌ Greška pri pokretanju servera:", error.message);
    process.exit(1);
  }
};

startServer();

// 🔥 GRACEFUL SHUTDOWN
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    time: new Date().toISOString(),
  });
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    time: new Date().toISOString(),
  });
  process.exit(1);
});
