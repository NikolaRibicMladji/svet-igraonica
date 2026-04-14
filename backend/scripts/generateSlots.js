const dotenv = require("dotenv");
const path = require("path");

// Učitaj .env iz root foldera
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("../config/db");
const { generateAllTimeSlots } = require("../utils/generateTimeSlots");

const run = async () => {
  try {
    console.log("🔌 Povezujem se na bazu...");
    await connectDB();
    console.log("✅ Povezano!\n");

    const days = 30;
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
    console.error("❌ Greška:", error.message);
    process.exit(1);
  } finally {
    console.log("\n🏁 Završeno.");
    process.exit(0);
  }
};

run();
