const errorHandler = (err, req, res, next) => {
  console.error("❌ ERROR:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || "Greška na serveru";

  // 🔥 Mongo duplicate key (npr email, slot, itd)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field} već postoji`;
  }

  // 🔥 Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Nevalidan ID";
  }

  // 🔥 Validation error (Mongoose)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

module.exports = errorHandler;
