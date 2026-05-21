class ErrorResponse extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.name = "ErrorResponse";
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;
