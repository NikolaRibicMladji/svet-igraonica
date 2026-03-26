const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

// Učitaj .env iz root foldera (jedan nivo gore)
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = require("./config/db");

// Poveži se sa bazom
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rute
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/playrooms", require("./routes/playroomRoutes"));
app.use("/api/timeslots", require("./routes/timeSlotRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/upload", require("./routes/tempUploadRoutes"));

// Test ruta
app.get("/", (req, res) => {
  res.json({ message: "Svet igraonica API radi!" });
});

const PORT = process.env.PORT || 5000;

// Pokreni cron job za završavanje termina
if (process.env.NODE_ENV !== "test") {
  require("./jobs/completeBookings");
}

app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});
