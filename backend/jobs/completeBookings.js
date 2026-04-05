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

    const bookings = await Booking.find({
      status: BOOKING_STATUS.POTVRDJENO,
    }).select("_id datum vremeDo status");

    let completedCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      if (!booking.datum || Number.isNaN(new Date(booking.datum).getTime())) {
        skippedCount++;
        console.warn(
          `⚠️ Rezervacija ${booking._id} preskočena: datum nije validan`,
        );
        continue;
      }

      if (!booking.vremeDo || typeof booking.vremeDo !== "string") {
        skippedCount++;
        console.warn(
          `⚠️ Rezervacija ${booking._id} preskočena: nedostaje ili nije validno vremeDo`,
        );
        continue;
      }

      const [hour, minute] = booking.vremeDo
        .split(":")
        .map((v) => parseInt(v, 10));

      if (Number.isNaN(hour) || Number.isNaN(minute)) {
        skippedCount++;
        console.warn(
          `⚠️ Rezervacija ${booking._id} preskočena: neispravan format vremeDo (${booking.vremeDo})`,
        );
        continue;
      }

      const endTime = new Date(booking.datum);
      endTime.setHours(hour, minute, 0, 0);

      if (endTime <= now) {
        booking.status = BOOKING_STATUS.ZAVRSENO;
        await booking.save();
        completedCount++;
      }
    }

    if (completedCount > 0) {
      console.log(`📊 Završeno ${completedCount} termina`);
    } else {
      console.log("📭 Nema termina za završavanje");
    }

    if (skippedCount > 0) {
      console.log(
        `⚠️ Preskočeno ${skippedCount} rezervacija zbog loših podataka`,
      );
    }
  } catch (error) {
    console.error("❌ Greška pri završavanju termina:", error.message);
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
