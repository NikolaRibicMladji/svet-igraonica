const cron = require("node-cron");
const Booking = require("../models/Booking");

const BOOKING_STATUS = require("../constants/bookingStatus");

// Funkcija za završavanje termina koji su prošli
const completeExpiredBookings = async () => {
  try {
    const now = new Date();
    console.log(
      `🔍 Proveravam termine koji su završeni... (${now.toLocaleString("sr-RS")})`,
    );

    // Pronađi sve rezervacije koje su potvrđene, a termin im je prošao
    const bookings = await Booking.find({
      status: BOOKING_STATUS.POTVRDJENO,
      datum: { $lt: now }, // datum je prošao
    }).populate("timeSlotId");

    let completedCount = 0;

    for (const booking of bookings) {
      // Proveri da li je vreme termina prošlo
      const [hour, minute] = booking.vremeDo.split(":");
      const endTime = new Date(booking.datum);
      endTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

      if (endTime < now) {
        booking.status = BOOKING_STATUS.ZAVRSENO;
        await booking.save();
        completedCount++;
        console.log(`✅ Rezervacija ${booking._id} označena kao završena`);
      }
    }

    if (completedCount > 0) {
      console.log(`📊 Završeno ${completedCount} termina`);
    } else {
      console.log("📭 Nema termina za završavanje");
    }
  } catch (error) {
    console.error("❌ Greška pri završavanju termina:", error);
  }
};

// Pokreni odmah pri startu
completeExpiredBookings();

// Zakazivanje: svakih 30 minuta
cron.schedule("*/30 * * * *", () => {
  console.log("⏰ Cron job: Provera termina za završavanje...");
  completeExpiredBookings();
});

console.log("📅 Cron job za završavanje termina aktivan (svakih 30 minuta)");

module.exports = { completeExpiredBookings };
