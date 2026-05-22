const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Request logger
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 10);

  if (process.env.NODE_ENV !== "development") {
    return next();
  }

  const start = Date.now();

  console.log(
    `➡️ [${req.requestId}] ${req.method} ${req.originalUrl} - ${new Date().toLocaleString("sr-RS")}`,
  );

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `⬅️ [${req.requestId}] ${res.statusCode} ${req.method} ${req.originalUrl} (${duration}ms)`,
    );
  });

  return next();
});

// Core middleware
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? [process.env.FRONTEND_URL].filter(Boolean)
          : [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("CORS nije dozvoljen");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Sanitize parsed input
app.use(mongoSanitize());
app.use(xss());

// Rate limit helper
const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message,
        errors: [],
      });
    },
  });

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Previše zahteva, pokušajte ponovo kasnije",
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message:
    "Previše pokušaja prijave ili registracije. Pokušajte ponovo kasnije.",
});

const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Previše refresh zahteva. Pokušajte ponovo kasnije.",
});

const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Previše zahteva za reset lozinke. Pokušajte ponovo kasnije.",
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API radi",
    data: null,
  });
});

// Auth-specific limiters
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);
app.use("/api/auth/refresh", refreshLimiter);
app.use("/api/auth/forgot-password", passwordResetLimiter);
app.use("/api/auth/reset-password", passwordResetLimiter);
app.use("/api/auth/verify-email", authLimiter);

// API rute
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/playrooms", apiLimiter, require("./routes/playroomRoutes"));
app.use("/api/timeslots", apiLimiter, require("./routes/timeSlotRoutes"));
app.use("/api/bookings", apiLimiter, require("./routes/bookingRoutes"));
app.use("/api/admin", apiLimiter, require("./routes/adminRoutes"));
app.use("/api/reviews", apiLimiter, require("./routes/reviewRoutes"));
app.use("/api/upload", apiLimiter, require("./routes/uploadRoutes"));
app.use("/api/temp-upload", apiLimiter, require("./routes/tempUploadRoutes"));

// Root ruta
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: `Svet igraonica API radi u ${
      process.env.NODE_ENV || "development"
    } modu!`,
    data: null,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta nije pronađena",
    errors: [],
  });
});

// Error handler mora poslednji
app.use(errorHandler);

module.exports = app;
