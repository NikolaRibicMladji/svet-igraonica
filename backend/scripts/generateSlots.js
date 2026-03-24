const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Učitaj .env iz root foldera
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const connectDB = require("../config/db");
const { generateAllTimeSlots } = require("../utils/generateTimeSlots");

const run = async () => {
  try {
    console.log("🔌 Povezujem se na bazu...");
    await connectDB();
    console.log("✅ Povezano!\n");

    // Možeš promeniti broj dana ovde
    const days = 30;
    console.log(`📅 Generišem termine za narednih ${days} dana...\n`);

    const result = await generateAllTimeSlots(days);

    console.log("\n📊 KONAČAN REZULTAT:");
    console.log(`   Novi termini: ${result.totalCreated}`);
    console.log(`   Postojeći termini: ${result.totalExisting}`);

    if (result.results) {
      console.log("\n📋 Detalji po igraonicama:");
      result.results.forEach((r) => {
        console.log(
          `   • ${r.naziv}: ${r.createdCount || 0} novih, ${r.existingCount || 0} postojećih`,
        );
      });
    }
  } catch (error) {
    console.error("❌ Greška:", error);
  } finally {
    console.log("\n🏁 Završeno.");
    process.exit();
  }
};

run();
