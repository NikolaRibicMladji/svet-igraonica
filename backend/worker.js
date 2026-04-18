const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, "../.env") });

const startWorker = async () => {
  try {
    await connectDB();
    require("./workers/emailWorker");
    console.log("🚀 Email worker pokrenut");
  } catch (error) {
    console.error("❌ Greška pri pokretanju email worker-a:", error.message);
    process.exit(1);
  }
};

startWorker();
