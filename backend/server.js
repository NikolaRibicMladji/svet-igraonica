const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

// Load env
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = require("./config/db");
const app = require("./app");

const requiredEnv = [
  "NODE_ENV",
  "FRONTEND_URL",
  "MONGO_URI",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "APP_TIMEZONE",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Nedostaje obavezna ENV promenljiva: ${key}`);
    process.exit(1);
  }
}

const allowedNodeEnvs = ["development", "production", "test"];

if (!allowedNodeEnvs.includes(process.env.NODE_ENV)) {
  console.error(
    `❌ NODE_ENV mora biti jedan od: ${allowedNodeEnvs.join(", ")}`,
  );
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

let server;
let isShuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`🛑 Primljen ${signal}. Gasim server...`);

  const forceExitTimer = setTimeout(() => {
    console.error("❌ Forsirano gašenje servera");
    process.exit(1);
  }, 10000);

  forceExitTimer.unref();

  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }

    await mongoose.connection.close(false);

    console.log("✅ Server i MongoDB konekcija zatvoreni");
    process.exit(exitCode);
  } catch (error) {
    console.error("❌ Greška pri gašenju:", error.message);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM", 0));
process.on("SIGINT", () => shutdown("SIGINT", 0));

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    time: new Date().toISOString(),
  });

  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    time: new Date().toISOString(),
  });

  shutdown("uncaughtException", 1);
});

const startServer = async () => {
  try {
    await connectDB();

    // Cron (ne u testu)
    if (process.env.NODE_ENV !== "test") {
      require("./jobs/completeBookings");
      require("./jobs/emailQueueWorker");
      require("./jobs/cleanupEmailQueue");
    }

    server = app.listen(PORT, () => {
      console.log(
        `🚀 Server pokrenut na portu ${PORT} u ${process.env.NODE_ENV} modu`,
      );
    });
  } catch (error) {
    console.error("❌ Greška pri pokretanju servera:", error.message);
    process.exit(1);
  }
};

startServer();
