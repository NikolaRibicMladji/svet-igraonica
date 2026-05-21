const mongoose = require("mongoose");
const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const logger = require("../utils/logger");

const {
  APP_TIMEZONE,
  getNowInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
  parseDateOnlyInAppTimezone,
} = require("../utils/dateTime");

const { formatInTimeZone } = require("date-fns-tz");

const DAY_MAP = {
  1: "ponedeljak",
  2: "utorak",
  3: "sreda",
  4: "cetvrtak",
  5: "petak",
  6: "subota",
  7: "nedelja",
};

const DEFAULT_PRICE = 0;

const getStartOfDay = (date) => {
  return startOfDayInAppTimezone(date);
};

const getEndOfDay = (date) => {
  return endOfDayInAppTimezone(date);
};

const getDateKey = (date) => {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
};

const parseDateInput = (datum) => {
  if (datum instanceof Date) {
    return getStartOfDay(datum);
  }

  if (typeof datum === "string" && /^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return getStartOfDay(parseDateOnlyInAppTimezone(datum));
  }

  const parsed = new Date(datum);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return getStartOfDay(parsed);
};

const addDays = (date, daysToAdd) => {
  const d = new Date(date);
  d.setDate(d.getDate() + daysToAdd);
  return d;
};

const normalizeDays = (days) => {
  const value = Number(days);

  if (!Number.isFinite(value) || value < 1) {
    return 30;
  }

  return Math.min(Math.floor(value), 90);
};

const parseTimeToMinutes = (time = "") => {
  if (!/^\d{2}:\d{2}$/.test(String(time))) {
    return null;
  }

  const [hours, minutes] = String(time)
    .split(":")
    .map((v) => parseInt(v, 10));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (![0, 15, 30, 45].includes(minutes)) return null;

  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getSlotSettings = (playroom) => {
  const slotDuration = Number(playroom?.trajanjeTermina) || 60;
  const prepDuration = Number(playroom?.vremePripremeTermina) || 0;
  const slotStep = slotDuration + prepDuration;

  return {
    slotDuration,
    prepDuration,
    slotStep,
  };
};

const getWorkingHoursForDate = (playroom, date) => {
  const isoDay = formatInTimeZone(date, APP_TIMEZONE, "i");
  const dayKey = DAY_MAP[isoDay];
  const radnoVreme = playroom.radnoVreme?.[dayKey];

  if (!radnoVreme) {
    return { works: false, reason: "Nema radnog vremena" };
  }

  if (radnoVreme.radi === false) {
    return { works: false, reason: "Neradni dan" };
  }

  if (!radnoVreme.od || !radnoVreme.do) {
    return { works: false, reason: "Nedostaje od/do" };
  }

  const startMinutes = parseTimeToMinutes(radnoVreme.od);
  const endMinutes = parseTimeToMinutes(radnoVreme.do);

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes
  ) {
    return { works: false, reason: "Neispravno radno vreme" };
  }

  return {
    works: true,
    startMinutes,
    endMinutes,
  };
};

const buildExpectedSlotsForDate = (playroom, date) => {
  const workingHours = getWorkingHoursForDate(playroom, date);

  if (!workingHours.works) return [];

  const { slotDuration, slotStep } = getSlotSettings(playroom);
  const slots = [];

  for (
    let current = workingHours.startMinutes;
    current + slotDuration <= workingHours.endMinutes;
    current += slotStep
  ) {
    const vremeOd = formatMinutesToTime(current);
    const vremeDo = formatMinutesToTime(current + slotDuration);

    slots.push({
      datum: getStartOfDay(date),
      vremeOd,
      vremeDo,
      key: `${getDateKey(date)}_${vremeOd}_${vremeDo}`,
    });
  }

  return slots;
};

const createSlotPayload = (playroom, date, vremeOd, vremeDo) => ({
  playroomId: playroom._id,
  datum: getStartOfDay(date),
  vremeOd,
  vremeDo,
  cena: DEFAULT_PRICE,
  zauzeto: false,
  aktivno: true,
  vanRadnogVremena: false,
  napomenaAdmin: "",
});

/**
 * Generiši termine za jednu igraonicu za narednih N dana
 */
const generateTimeSlotsForPlayroom = async (playroomId, days = 30) => {
  try {
    if (!mongoose.isValidObjectId(playroomId)) {
      return {
        createdCount: 0,
        existingCount: 0,
        skippedDays: 0,
        error: "ID igraonice nije validan",
      };
    }

    const playroom = await Playroom.findById(playroomId).lean();

    if (!playroom) {
      return {
        createdCount: 0,
        existingCount: 0,
        skippedDays: 0,
        error: "Igraonica nije pronađena",
      };
    }

    if (!playroom.radnoVreme) {
      return {
        createdCount: 0,
        existingCount: 0,
        skippedDays: 0,
        error: "Nema definisano radno vreme",
      };
    }

    const numberOfDays = normalizeDays(days);
    const startDate = getStartOfDay(getNowInAppTimezone());

    let createdCount = 0;
    let existingCount = 0;
    let skippedDays = 0;

    for (let offset = 0; offset < numberOfDays; offset++) {
      const currentDate = getStartOfDay(addDays(startDate, offset));

      const expectedSlots = buildExpectedSlotsForDate(playroom, currentDate);

      if (expectedSlots.length === 0) {
        skippedDays++;
        continue;
      }

      const startOfDay = getStartOfDay(currentDate);
      const endOfDay = getEndOfDay(currentDate);

      const existingSlots = await TimeSlot.find({
        playroomId: playroom._id,
        datum: { $gte: startOfDay, $lte: endOfDay },
      })
        .select("_id vremeOd vremeDo")
        .lean();

      const existingKeys = new Set(
        existingSlots.map(
          (slot) =>
            `${getDateKey(currentDate)}_${slot.vremeOd}_${slot.vremeDo}`,
        ),
      );

      for (const slotData of expectedSlots) {
        if (existingKeys.has(slotData.key)) {
          existingCount++;
          continue;
        }

        try {
          await TimeSlot.create(
            createSlotPayload(
              playroom,
              currentDate,
              slotData.vremeOd,
              slotData.vremeDo,
            ),
          );
          createdCount++;
        } catch (err) {
          if (err.code === 11000) {
            existingCount++;
          } else {
            throw err;
          }
        }
      }
    }

    return {
      createdCount,
      existingCount,
      skippedDays,
    };
  } catch (error) {
    logger.error("Greška pri generisanju termina:", {
      message: error.message,
    });
    return {
      createdCount: 0,
      existingCount: 0,
      skippedDays: 0,
      error: error.message,
    };
  }
};

/**
 * Generiši termine za sve verifikovane igraonice
 */
const generateAllTimeSlots = async (days = 30) => {
  try {
    const playrooms = await Playroom.find({
      verifikovan: true,
      status: PLAYROOM_STATUS.AKTIVAN,
    })
      .select("_id naziv")
      .lean();

    if (playrooms.length === 0) {
      return { totalCreated: 0, totalExisting: 0, results: [] };
    }

    let totalCreated = 0;
    let totalExisting = 0;
    const results = [];

    for (const playroom of playrooms) {
      const result = await generateTimeSlotsForPlayroom(playroom._id, days);

      totalCreated += result.createdCount || 0;
      totalExisting += result.existingCount || 0;

      results.push({
        playroomId: playroom._id,
        naziv: playroom.naziv,
        ...result,
      });
    }

    return { totalCreated, totalExisting, results };
  } catch (error) {
    logger.error("Greška pri generisanju termina za sve igraonice:", {
      message: error.message,
    });
    return {
      totalCreated: 0,
      totalExisting: 0,
      error: error.message,
      results: [],
    };
  }
};

/**
 * Obriši sve termine za igraonicu bez aktivnih rezervacija
 */
const deleteAllTimeSlotsForPlayroom = async (playroomId) => {
  try {
    if (!mongoose.isValidObjectId(playroomId)) {
      return { error: "ID igraonice nije validan" };
    }

    const result = await TimeSlot.deleteMany({
      playroomId,
      zauzeto: false,
      aktivno: false,
    });

    return { deletedCount: result.deletedCount };
  } catch (error) {
    logger.error("Greška pri brisanju termina:", {
      message: error.message,
    });
    return { error: error.message };
  }
};

/**
 * Resetuj termine za igraonicu (samo slotovi bez rezervacija)
 */
const resetTimeSlotsForPlayroom = async (playroomId, days = 30) => {
  try {
    await deleteAllTimeSlotsForPlayroom(playroomId);
    return await generateTimeSlotsForPlayroom(playroomId, days);
  } catch (error) {
    logger.error("Greška pri resetovanju termina:", {
      message: error.message,
    });
    return { error: error.message };
  }
};

/**
 * Generiši termine samo za jedan dan
 */
const generateTimeSlotsForDay = async (playroomId, datum) => {
  try {
    if (!mongoose.isValidObjectId(playroomId)) {
      return {
        createdCount: 0,
        existingCount: 0,
        error: "ID igraonice nije validan",
      };
    }

    const playroom = await Playroom.findById(playroomId).lean();

    if (!playroom) {
      return {
        createdCount: 0,
        existingCount: 0,
        error: "Igraonica nije pronađena",
      };
    }

    const targetDate = parseDateInput(datum);

    if (!targetDate) {
      return {
        createdCount: 0,
        existingCount: 0,
        error: "Datum nije validan",
      };
    }
    const expectedSlots = buildExpectedSlotsForDate(playroom, targetDate);

    if (expectedSlots.length === 0) {
      return {
        createdCount: 0,
        existingCount: 0,
        message: "Igraonica ne radi ovog dana",
      };
    }

    const startOfDay = getStartOfDay(targetDate);
    const endOfDay = getEndOfDay(targetDate);

    const existingSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startOfDay, $lte: endOfDay },
    })
      .select("_id vremeOd vremeDo")
      .lean();

    const existingKeys = new Set(
      existingSlots.map(
        (slot) => `${getDateKey(targetDate)}_${slot.vremeOd}_${slot.vremeDo}`,
      ),
    );

    let createdCount = 0;
    let existingCount = 0;

    for (const slotData of expectedSlots) {
      if (existingKeys.has(slotData.key)) {
        existingCount++;
        continue;
      }

      try {
        await TimeSlot.create(
          createSlotPayload(
            playroom,
            targetDate,
            slotData.vremeOd,
            slotData.vremeDo,
          ),
        );
        createdCount++;
      } catch (err) {
        if (err.code === 11000) {
          existingCount++;
        } else {
          throw err;
        }
      }
    }

    return {
      createdCount,
      existingCount,
      message: `Generisano ${createdCount} termina za ${getDateKey(targetDate)}`,
    };
  } catch (error) {
    logger.error("Greška pri generisanju termina za dan:", {
      message: error.message,
    });
    return { error: error.message };
  }
};

/**
 * Sinhronizuj termine sa radnim vremenom bez brisanja slotova sa rezervacijama
 */
const syncTimeSlotsWithWorkingHours = async (playroomId, days = 30) => {
  try {
    if (!mongoose.isValidObjectId(playroomId)) {
      return {
        success: false,
        message: "ID igraonice nije validan",
      };
    }

    const playroom = await Playroom.findById(playroomId).lean();

    if (!playroom) {
      return { success: false, message: "Igraonica nije pronađena" };
    }

    const numberOfDays = normalizeDays(days);
    const startDate = getStartOfDay(getNowInAppTimezone());
    const endDate = getEndOfDay(addDays(startDate, numberOfDays - 1));

    const expectedKeys = new Set();

    let createdCount = 0;
    let deactivatedCount = 0;
    let conflictCount = 0;
    let reactivatedCount = 0;

    for (let offset = 0; offset < numberOfDays; offset++) {
      const currentDate = getStartOfDay(addDays(startDate, offset));

      const expectedSlots = buildExpectedSlotsForDate(playroom, currentDate);

      for (const slotData of expectedSlots) {
        expectedKeys.add(slotData.key);
      }

      const startOfDay = getStartOfDay(currentDate);
      const endOfDay = getEndOfDay(currentDate);

      const existingSlots = await TimeSlot.find({
        playroomId,
        datum: { $gte: startOfDay, $lte: endOfDay },
      }).lean();

      const existingMap = new Map(
        existingSlots.map((slot) => [
          `${getDateKey(currentDate)}_${slot.vremeOd}_${slot.vremeDo}`,
          slot,
        ]),
      );

      for (const slotData of expectedSlots) {
        const existingSlot = existingMap.get(slotData.key);

        if (!existingSlot) {
          try {
            await TimeSlot.create(
              createSlotPayload(
                playroom,
                currentDate,
                slotData.vremeOd,
                slotData.vremeDo,
              ),
            );
            createdCount++;
          } catch (err) {
            if (err.code === 11000) {
              // slot je u međuvremenu već kreiran
            } else {
              throw err;
            }
          }
          continue;
        }

        const updates = {};
        let shouldUpdate = false;

        if (existingSlot.aktivno === false) {
          updates.aktivno = true;
          shouldUpdate = true;
        }

        if (existingSlot.vanRadnogVremena === true) {
          updates.vanRadnogVremena = false;
          shouldUpdate = true;
        }

        if (existingSlot.napomenaAdmin) {
          updates.napomenaAdmin = "";
          shouldUpdate = true;
        }

        if ((existingSlot.cena || 0) !== DEFAULT_PRICE) {
          updates.cena = DEFAULT_PRICE;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await TimeSlot.findByIdAndUpdate(
            existingSlot._id,
            { $set: updates },
            { runValidators: true },
          );
          reactivatedCount++;
        }
      }
    }

    const allSlotsInRange = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
    }).lean();

    for (const slot of allSlotsInRange) {
      const slotKey = `${getDateKey(slot.datum)}_${slot.vremeOd}_${slot.vremeDo}`;
      const shouldExist = expectedKeys.has(slotKey);

      if (shouldExist) continue;

      if (slot.zauzeto) {
        await TimeSlot.findByIdAndUpdate(
          slot._id,
          {
            $set: {
              vanRadnogVremena: true,
              napomenaAdmin:
                "Slot je van novog radnog vremena, ali ima postojeću rezervaciju.",
            },
          },
          { runValidators: true },
        );
        conflictCount++;
      } else {
        await TimeSlot.findByIdAndUpdate(
          slot._id,
          {
            $set: {
              aktivno: false,
              vanRadnogVremena: true,
              napomenaAdmin: "Slot deaktiviran zbog promene radnog vremena.",
            },
          },
          { runValidators: true },
        );
        deactivatedCount++;
      }
    }

    return {
      success: true,
      createdCount,
      deactivatedCount,
      conflictCount,
      reactivatedCount,
    };
  } catch (error) {
    logger.error("Greška pri sinhronizaciji termina:", {
      message: error.message,
    });
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = {
  generateTimeSlotsForPlayroom,
  generateAllTimeSlots,
  deleteAllTimeSlotsForPlayroom,
  resetTimeSlotsForPlayroom,
  generateTimeSlotsForDay,
  syncTimeSlotsWithWorkingHours,
};
