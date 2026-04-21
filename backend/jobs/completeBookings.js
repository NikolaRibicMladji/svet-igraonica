const cron = require("node-cron");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const TimeSlot = require("../models/TimeSlot");
const {
  APP_TIMEZONE,
  getNowInAppTimezone,
  buildDateTimeInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
} = require("../utils/dateTime");

// Funkcija za završavanje termina koji su prošli
const completeExpiredBookings = async () => {
  try {
    const now = getNowInAppTimezone();
    const startOfToday = startOfDayInAppTimezone(now);
    const endOfToday = endOfDayInAppTimezone(now);

    console.log(
      `🔍 Proveravam termine koji su završeni... (${now.toLocaleString("sr-RS")})`,
    );

    // Uzimamo SAMO potvrđene rezervacije koje MOGU biti istekle:
    // 1) sve potvrđene pre današnjeg dana
    // 2) današnje potvrđene sa vremeDo <= trenutno vreme
    const todayTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    const candidateBookings = await Booking.find({
      status: BOOKING_STATUS.POTVRDJENO,
      $or: [
        { datum: { $lt: startOfToday } },
        {
          datum: { $gte: startOfToday, $lte: endOfToday },
          vremeDo: { $lte: todayTime },
        },
      ],
    }).select("_id datum vremeDo timeSlotId");

    if (!candidateBookings.length) {
      console.log("📭 Nema termina za završavanje");
      return;
    }

    // Dodatna zaštita: zadržavamo samo stvarno istekle termine
    const expiredBookings = candidateBookings.filter((booking) => {
      if (!booking.datum || !booking.vremeDo) return false;

      try {
        const endTime = buildDateTimeInAppTimezone(
          booking.datum,
          booking.vremeDo,
        );
        return endTime <= now;
      } catch {
        return false;
      }
    });

    if (!expiredBookings.length) {
      console.log("📭 Nema termina za završavanje");
      return;
    }

    const bookingIds = expiredBookings.map((booking) => booking._id);
    const slotIds = expiredBookings
      .map((booking) => booking.timeSlotId)
      .filter(Boolean);

    const bookingUpdateResult = await Booking.updateMany(
      {
        _id: { $in: bookingIds },
        status: BOOKING_STATUS.POTVRDJENO,
      },
      {
        $set: { status: BOOKING_STATUS.ZAVRSENO },
      },
    );

    if (slotIds.length > 0) {
      await TimeSlot.updateMany(
        {
          _id: { $in: slotIds },
          zauzeto: true,
        },
        {
          $set: { zauzeto: false },
        },
      );
    }

    console.log(
      `📊 Završeno ${bookingUpdateResult.modifiedCount || expiredBookings.length} termina`,
    );
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
