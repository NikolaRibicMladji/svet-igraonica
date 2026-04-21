const IORedis = require("ioredis");

const redis = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new IORedis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

redis.on("connect", () => {
  console.log("✅ Redis povezan");
});

redis.on("error", (err) => {
  console.error("❌ Redis greška:", err.message);
});

module.exports = redis;
