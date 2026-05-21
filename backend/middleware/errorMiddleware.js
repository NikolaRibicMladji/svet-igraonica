const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  console.error("❌ ERROR:", {
    requestId: req.requestId,
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id || null,
    time: new Date().toISOString(),
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || "Greška na serveru";
  let errors = [];

  // Mongo duplicate key
  if (err.code === 11000) {
    statusCode = 409;

    const field = Object.keys(err.keyValue || {})[0];

    message = field ? `${field} već postoji` : "Duplikat već postoji";

    errors = [
      {
        field: field || null,
        message,
      },
    ];
  }

  // Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Nevalidan ID";

    errors = [
      {
        field: err.path || null,
        message,
      },
    ];
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 422;

    errors = Object.values(err.errors || {}).map((val) => ({
      field: val.path || null,
      message: val.message,
    }));

    message = errors.map((e) => e.message).join(", ");
  }

  // Zod validation
  if (err.name === "ZodError") {
    statusCode = 422;

    errors = (err.issues || err.errors || []).map((issue) => ({
      field: issue.path?.join(".") || null,
      message: issue.message,
    }));

    message = errors.map((e) => e.message).join(", ");
  }

  // Invalid JSON body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Nevalidan JSON format";

    errors = [
      {
        field: "body",
        message,
      },
    ];
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token nije validan";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token je istekao";
  }

  // Ne leak-ujemo interne greške u production-u
  if (!isDevelopment && statusCode === 500) {
    message = "Greška na serveru";
    errors = [];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(isDevelopment && {
      requestId: req.requestId,
      stack: err.stack,
    }),
  });
};

module.exports = errorHandler;
