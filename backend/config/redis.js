const IORedis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on("connect", () => {
    console.log("✅ Redis povezan");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis greška:", err.message);
  });
} else {
  console.log("⚠️ Redis nije uključen (lokalni rad)");
}

module.exports = redis;
