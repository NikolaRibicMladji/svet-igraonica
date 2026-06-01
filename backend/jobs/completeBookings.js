const cron = require("node-cron");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");
const BOOKING_STATUS = require("../constants/bookingStatus");
const TimeSlot = require("../models/TimeSlot");
const logger = require("../utils/logger");
const { cancelExpiredPendingBookings } = require("../services/bookingService");
const {
  APP_TIMEZONE,
  getNowInAppTimezone,
  buildDateTimeInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
} = require("../utils/dateTime");

let isRunning = false;

// Funkcija za završavanje termina koji su prošli
const completeExpiredBookings = async () => {
  if (isRunning) {
    logger.warn("Complete bookings job već radi, preskačem ovaj ciklus");
    return;
  }

  isRunning = true;

  try {
    const now = getNowInAppTimezone();
    const startOfToday = startOfDayInAppTimezone(now);
    const endOfToday = endOfDayInAppTimezone(now);

    logger.info(
      `🔍 Proveravam termine koji su završeni... (${now.toLocaleString("sr-RS")})`,
    );

    const autoCancelResult = await cancelExpiredPendingBookings();

    if (autoCancelResult.modifiedCount > 0) {
      logger.info(
        `🕒 Automatski otkazano ${autoCancelResult.modifiedCount} isteklih rezervacija na čekanju`,
      );
    }

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
    })
      .select("_id datum vremeDo timeSlotId")
      .lean();

    if (!candidateBookings.length) {
      logger.info("📭 Nema termina za završavanje");
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
      logger.info("📭 Nema termina za završavanje");
      return;
    }

    const bookingIds = expiredBookings.map((booking) => booking._id);
    const slotIds = [
      ...new Set(
        expiredBookings
          .map((booking) => booking.timeSlotId?.toString())
          .filter(Boolean),
      ),
    ];

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const bookingUpdateResult = await Booking.updateMany(
        {
          _id: { $in: bookingIds },
          status: BOOKING_STATUS.POTVRDJENO,
        },
        {
          $set: {
            status: BOOKING_STATUS.ZAVRSENO,
            zavrsenoAt: now,
          },
        },
        {
          session,
          runValidators: true,
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
          {
            session,
            runValidators: true,
          },
        );
      }

      await session.commitTransaction();

      logger.info(
        `📊 Završeno ${
          bookingUpdateResult.modifiedCount || expiredBookings.length
        } termina`,
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error("Greška pri završavanju termina", {
      message: error.message,
    });
  } finally {
    isRunning = false;
  }
};

// Pokreni odmah pri startu
completeExpiredBookings();

// Zakazivanje: svakih 5 minuta
cron.schedule(
  "*/5 * * * *",
  () => {
    logger.info(
      `⏰ Cron job: Provera termina za završavanje... [${APP_TIMEZONE}]`,
    );
    completeExpiredBookings();
  },
  {
    timezone: APP_TIMEZONE,
  },
);

logger.info(
  `📅 Cron job za završavanje termina aktivan (svakih 5 minuta) | timezone: ${APP_TIMEZONE}`,
);

module.exports = { completeExpiredBookings };
