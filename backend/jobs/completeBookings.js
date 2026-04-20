const cron = require("node-cron");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const TimeSlot = require("../models/TimeSlot");
const {
  APP_TIMEZONE,
  getNowInAppTimezone,
  buildDateTimeInAppTimezone,
} = require("../utils/dateTime");

// Funkcija za završavanje termina koji su prošli
const completeExpiredBookings = async () => {
  try {
    const now = new Date();
    console.log(
      `🔍 Proveravam termine koji su završeni... (${now.toLocaleString("sr-RS")})`,
    );

    const bookings = await Booking.find({
      status: BOOKING_STATUS.POTVRDJENO,
    }).select("_id datum vremeDo status timeSlotId");

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

      const endTime = buildDateTimeInAppTimezone(
        booking.datum,
        booking.vremeDo,
      );

      if (endTime <= now) {
        booking.status = BOOKING_STATUS.ZAVRSENO;
        await booking.save();

        await TimeSlot.findOneAndUpdate(
          {
            _id: booking.timeSlotId,
            zauzeto: true,
          },
          {
            $set: { zauzeto: false },
          },
        );
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

// Zakazivanje: svakih 10 minuta
cron.schedule(
  "*/10 * * * *",
  () => {
    console.log(
      `⏰ Cron job: Provera termina za završavanje... [${APP_TIMEZONE}]`,
    );
    completeExpiredBookings();
  },
  {
    timezone: APP_TIMEZONE,
  },
);

console.log(
  `📅 Cron job za završavanje termina aktivan (svakih 10 minuta) | timezone: ${APP_TIMEZONE}`,
);

module.exports = { completeExpiredBookings };
