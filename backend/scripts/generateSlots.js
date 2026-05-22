const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

// Učitaj .env iz root foldera projekta
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("../config/db");
const { generateAllTimeSlots } = require("../utils/generateTimeSlots");

const parseDays = () => {
  const value = Number(process.argv[2] || 30);

  if (!Number.isInteger(value) || value < 1 || value > 90) {
    throw new Error("Broj dana mora biti ceo broj između 1 i 90");
  }

  return value;
};

const run = async () => {
  let exitCode = 0;

  try {
    const days = parseDays();

    console.log("🔌 Povezujem se na bazu...");
    await connectDB();
    console.log("✅ Povezano!\n");

    console.log(`📅 Generišem termine za narednih ${days} dana...\n`);

    const result = await generateAllTimeSlots(days);

    console.log("\n📊 KONAČAN REZULTAT:");
    console.log(`   Novi termini: ${result.totalCreated || 0}`);
    console.log(`   Postojeći termini: ${result.totalExisting || 0}`);

    if (Array.isArray(result.results) && result.results.length > 0) {
      console.log("\n📋 Detalji po igraonicama:");

      result.results.forEach((r) => {
        console.log(
          `   • ${r.naziv}: ${r.createdCount || 0} novih, ${
            r.existingCount || 0
          } postojećih${r.error ? ` | greška: ${r.error}` : ""}`,
        );
      });
    }
  } catch (error) {
    exitCode = 1;
    console.error("❌ Greška:", error.message);
  } finally {
    try {
      await mongoose.connection.close(false);
      console.log("\n🔌 MongoDB konekcija zatvorena.");
    } catch (closeError) {
      exitCode = 1;
      console.error("❌ Greška pri zatvaranju konekcije:", closeError.message);
    }

    console.log("🏁 Završeno.");
    process.exit(exitCode);
  }
};

run();
