const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorMiddleware");
const connectDB = require("./config/db");

// 1. Konfiguracija okruženja
dotenv.config({ path: path.join(__dirname, "../.env") });

// 2. Povezivanje sa bazom
connectDB();

const app = express();

// 3. Middleware
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

// Povećavamo limit za upload slika (bitno za vlasnike)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Statička putanja za uploadovane fajlove (ako ih čuvaš lokalno)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 4. API Rute
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/playrooms", require("./routes/playroomRoutes"));
app.use("/api/timeslots", require("./routes/timeSlotRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
// POPRAVLJENO: Spojio sam tvoje dve upload rute u jednu logičnu
app.use("/api/upload", require("./routes/uploadRoutes"));

// 5. REŠENJE ZA "CANNOT GET" GREŠKU (SPA Routing)
// Ovo omogućava React-u da preuzme rute poput /vlasnik/dashboard
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"));
  });
} else {
  // Test ruta za razvoj
  app.get("/", (req, res) => {
    res.json({ message: "Svet igraonica API radi u development modu!" });
  });
}

// 6. Pokreni cron job (samo ako nije testiranje)
if (process.env.NODE_ENV !== "test") {
  require("./jobs/completeBookings");
}

// 7. Error Handling (Mora biti poslednji middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🚀 Server pokrenut na portu ${PORT} u ${process.env.NODE_ENV || "development"} modu`,
  );
});
