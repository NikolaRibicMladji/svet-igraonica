const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const PLAYROOM_STATUS = require("../constants/playroomStatus");

const DAY_MAP = {
  monday: "ponedeljak",
  tuesday: "utorak",
  wednesday: "sreda",
  thursday: "cetvrtak",
  friday: "petak",
  saturday: "subota",
  sunday: "nedelja",
};

const DEFAULT_CAPACITY = 20;
const DEFAULT_PRICE = 800;

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getDateKey = (date) => {
  return getStartOfDay(date).toISOString().split("T")[0];
};

const parseTimeToMinutes = (time = "") => {
  const [hours, minutes] = String(time)
    .split(":")
    .map((v) => parseInt(v, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
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
  const weekday = date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const dayKey = DAY_MAP[weekday];
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

  cena: playroom.osnovnaCena ?? DEFAULT_PRICE,
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
    const playroom = await Playroom.findById(playroomId);
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

    const startDate = getStartOfDay(new Date());
    const endDate = getEndOfDay(
      new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000),
    );

    let createdCount = 0;
    let existingCount = 0;
    let skippedDays = 0;

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const currentDate = new Date(d);
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
      }).select("_id vremeOd vremeDo");

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
    console.error("Greška pri generisanju termina:", error);
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
    });

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
    console.error("Greška pri generisanju termina za sve igraonice:", error);
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
    const result = await TimeSlot.deleteMany({
      playroomId,
      zauzeto: false,
      aktivno: false,
    });

    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error("Greška pri brisanju termina:", error);
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
    console.error("Greška pri resetovanju termina:", error);
    return { error: error.message };
  }
};

/**
 * Generiši termine samo za jedan dan
 */
const generateTimeSlotsForDay = async (playroomId, datum) => {
  try {
    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return {
        createdCount: 0,
        existingCount: 0,
        error: "Igraonica nije pronađena",
      };
    }

    const targetDate = getStartOfDay(new Date(datum));
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
    }).select("_id vremeOd vremeDo");

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
      message: `Generisano ${createdCount} termina za ${datum}`,
    };
  } catch (error) {
    console.error("Greška pri generisanju termina za dan:", error);
    return { error: error.message };
  }
};

/**
 * Sinhronizuj termine sa radnim vremenom bez brisanja slotova sa rezervacijama
 */
const syncTimeSlotsWithWorkingHours = async (playroomId, days = 30) => {
  try {
    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return { success: false, message: "Igraonica nije pronađena" };
    }

    const startDate = getStartOfDay(new Date());
    const endDate = getEndOfDay(
      new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000),
    );

    const expectedKeys = new Set();

    let createdCount = 0;
    let deactivatedCount = 0;
    let conflictCount = 0;
    let reactivatedCount = 0;

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const currentDate = new Date(d);
      const expectedSlots = buildExpectedSlotsForDate(playroom, currentDate);

      for (const slotData of expectedSlots) {
        expectedKeys.add(slotData.key);
      }

      const startOfDay = getStartOfDay(currentDate);
      const endOfDay = getEndOfDay(currentDate);

      const existingSlots = await TimeSlot.find({
        playroomId,
        datum: { $gte: startOfDay, $lte: endOfDay },
      });

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

        if (
          (existingSlot.maxDece || 0) !==
          (playroom.kapacitet?.deca || DEFAULT_CAPACITY)
        ) {
          updates.maxDece = playroom.kapacitet?.deca || DEFAULT_CAPACITY;
          shouldUpdate = true;
        }

        if (
          (existingSlot.cena || 0) !== (playroom.osnovnaCena ?? DEFAULT_PRICE)
        ) {
          updates.cena = playroom.osnovnaCena ?? DEFAULT_PRICE;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await TimeSlot.findByIdAndUpdate(existingSlot._id, updates);
          reactivatedCount++;
        }
      }
    }

    const allSlotsInRange = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
    });

    for (const slot of allSlotsInRange) {
      const slotKey = `${getDateKey(slot.datum)}_${slot.vremeOd}_${slot.vremeDo}`;
      const shouldExist = expectedKeys.has(slotKey);

      if (shouldExist) continue;

      if (slot.zauzeto) {
        await TimeSlot.findByIdAndUpdate(slot._id, {
          vanRadnogVremena: true,
          napomenaAdmin:
            "Slot je van novog radnog vremena, ali ima postojeću rezervaciju.",
        });
        conflictCount++;
      } else {
        await TimeSlot.findByIdAndUpdate(slot._id, {
          aktivno: false,
          vanRadnogVremena: true,
          napomenaAdmin: "Slot deaktiviran zbog promene radnog vremena.",
        });
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
    console.error("Greška pri sinhronizaciji termina:", error);
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
