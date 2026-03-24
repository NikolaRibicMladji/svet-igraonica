const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");

/**
 * Generiši termine za jednu igraonicu za narednih N dana
 * @param {string} playroomId - ID igraonice
 * @param {number} days - Broj dana unapred (default 30)
 * @returns {Promise<{createdCount: number, existingCount: number, error?: string}>}
 */
const generateTimeSlotsForPlayroom = async (playroomId, days = 30) => {
  try {
    // Proveri da li igraonica postoji
    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      console.log(`❌ Igraonica sa ID ${playroomId} nije pronađena`);
      return {
        createdCount: 0,
        existingCount: 0,
        error: "Igraonica nije pronađena",
      };
    }

    // Proveri da li igraonica ima radno vreme
    if (!playroom.radnoVreme) {
      console.log(`⚠️ Igraonica ${playroom.naziv} nema definisano radno vreme`);
      return {
        createdCount: 0,
        existingCount: 0,
        error: "Nema definisano radno vreme",
      };
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    let createdCount = 0;
    let existingCount = 0;
    let skippedDays = 0;

    console.log(
      `🔄 Generišem termine za ${playroom.naziv} (narednih ${days} dana)...`,
    );

    // Za svaki dan u narednih N dana
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const currentDate = new Date(d);
      const danUNedelji = currentDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      // Mapiramo dane na srpski
      const danMap = {
        monday: "ponedeljak",
        tuesday: "utorak",
        wednesday: "sreda",
        thursday: "cetvrtak",
        friday: "petak",
        saturday: "subota",
        sunday: "nedelja",
      };

      const radnoVreme = playroom.radnoVreme?.[danMap[danUNedelji]];

      // Ako igraonica ne radi taj dan, preskoči
      if (!radnoVreme || !radnoVreme.od || !radnoVreme.do) {
        skippedDays++;
        continue;
      }

      // Generiši termine na svaka 2 sata
      const startHour = parseInt(radnoVreme.od.split(":")[0]);
      const endHour = parseInt(radnoVreme.do.split(":")[0]);

      // Zaštita od beskonačne petlje
      if (startHour >= endHour) {
        console.log(
          `⚠️ ${playroom.naziv} - Neispravno radno vreme za ${danMap[danUNedelji]}: ${radnoVreme.od} - ${radnoVreme.do}`,
        );
        continue;
      }

      for (let hour = startHour; hour < endHour; hour += 2) {
        const vremeOd = `${hour.toString().padStart(2, "0")}:00`;
        const vremeDo = `${(hour + 2).toString().padStart(2, "0")}:00`;

        // Proveri da li vremeDo nije preko radnog vremena
        const endHourNum = parseInt(vremeDo.split(":")[0]);
        if (endHourNum > endHour) {
          continue;
        }

        // Postavi opseg datuma za proveru
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Proveri da li već postoji termin za ovo vreme
        const existingSlot = await TimeSlot.findOne({
          playroomId,
          datum: { $gte: startOfDay, $lte: endOfDay },
          vremeOd,
          vremeDo,
        });

        if (!existingSlot) {
          await TimeSlot.create({
            playroomId,
            datum: new Date(currentDate),
            vremeOd,
            vremeDo,
            zauzeto: false, // SLOBODAN TERMIN
            cena: playroom.cenovnik?.osnovni || 800,
          });
          createdCount++;
        } else {
          existingCount++;
        }
      }
    }

    console.log(
      `✅ ${playroom.naziv}: Generisano ${createdCount} novih termina, ${existingCount} već postoji, ${skippedDays} dana neradnih`,
    );
    return { createdCount, existingCount, skippedDays };
  } catch (error) {
    console.error(`❌ Greška pri generisanju termina za igraonicu:`, error);
    return { createdCount: 0, existingCount: 0, error: error.message };
  }
};

/**
 * Generiši termine za sve verifikovane igraonice
 * @param {number} days - Broj dana unapred (default 30)
 * @returns {Promise<{totalCreated: number, totalExisting: number, results: Array}>}
 */
const generateAllTimeSlots = async (days = 30) => {
  try {
    console.log(
      `🚀 Pokrećem generisanje termina za sve igraonice (${days} dana unapred)...`,
    );

    const playrooms = await Playroom.find({
      verifikovan: true,
      status: "aktivan",
    });

    if (playrooms.length === 0) {
      console.log("⚠️ Nema verifikovanih igraonica za generisanje termina");
      return { totalCreated: 0, totalExisting: 0, results: [] };
    }

    console.log(`📋 Pronađeno ${playrooms.length} verifikovanih igraonica`);

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

    console.log(
      `\n📊 UKUPNO: Generisano ${totalCreated} novih termina, ${totalExisting} već postoji za ${playrooms.length} igraonica`,
    );
    return { totalCreated, totalExisting, results };
  } catch (error) {
    console.error("❌ Greška pri generisanju termina za sve igraonice:", error);
    return {
      totalCreated: 0,
      totalExisting: 0,
      error: error.message,
      results: [],
    };
  }
};

/**
 * Obriši sve termine za igraonicu (opciono)
 * @param {string} playroomId - ID igraonice
 */
const deleteAllTimeSlotsForPlayroom = async (playroomId) => {
  try {
    const result = await TimeSlot.deleteMany({ playroomId });
    console.log(
      `🗑 Obrisano ${result.deletedCount} termina za igraonicu ${playroomId}`,
    );
    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error("Greška pri brisanju termina:", error);
    return { error: error.message };
  }
};

/**
 * Resetuj termine za igraonicu (obriši sve i generiši nove)
 * @param {string} playroomId - ID igraonice
 * @param {number} days - Broj dana unapred
 */
const resetTimeSlotsForPlayroom = async (playroomId, days = 30) => {
  try {
    console.log(`🔄 Resetujem termine za igraonicu ${playroomId}...`);
    await deleteAllTimeSlotsForPlayroom(playroomId);
    const result = await generateTimeSlotsForPlayroom(playroomId, days);
    return result;
  } catch (error) {
    console.error("Greška pri resetovanju termina:", error);
    return { error: error.message };
  }
};

module.exports = {
  generateTimeSlotsForPlayroom,
  generateAllTimeSlots,
  deleteAllTimeSlotsForPlayroom,
  resetTimeSlotsForPlayroom,
};
