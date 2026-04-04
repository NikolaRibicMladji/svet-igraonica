const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.set("trust proxy", 1);

// Security
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Previše zahteva, pokušajte ponovo kasnije",
  },
});

app.use("/api", limiter);

// Core middleware
app.use(cookieParser());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API radi",
  });
});

// API rute
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/playrooms", require("./routes/playroomRoutes"));
app.use("/api/timeslots", require("./routes/timeSlotRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/temp-upload", require("./routes/tempUploadRoutes"));

// SPA fallback / dev root
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/build/index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Svet igraonica API radi u development modu!",
    });
  });
}

// Error handler mora poslednji
app.use(errorHandler);

module.exports = app;
