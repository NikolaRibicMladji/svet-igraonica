const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const app = require("./app");

// Konfiguracija okruženja
dotenv.config({ path: path.join(__dirname, "../.env") });

// Povezivanje sa bazom
connectDB();

// Pokreni cron job samo van test okruženja
if (process.env.NODE_ENV !== "test") {
  require("./jobs/completeBookings");
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server pokrenut na portu ${PORT} u ${process.env.NODE_ENV || "development"} modu`,
  );
});
