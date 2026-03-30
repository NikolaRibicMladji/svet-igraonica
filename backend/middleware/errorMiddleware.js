const ErrorResponse = require("../utils/errorResponse");

const errorHandler = (err, req, res, next) => {
  let error = err;

  console.error("[ERROR]", err.name, err.message);

  if (err.name === "CastError") {
    error = new ErrorResponse(`Resurs nije pronađen sa ID: ${err.value}`, 404);
  }

  if (err.code === 11000) {
    error = new ErrorResponse("Podatak već postoji u bazi", 400);
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Greška na serveru",
  });
};

module.exports = errorHandler;
