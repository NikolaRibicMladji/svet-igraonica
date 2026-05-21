const ErrorResponse = require("../utils/errorResponse");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ErrorResponse("Nemate dozvolu za ovu akciju", 403));
    }

    return next();
  };
};

module.exports = authorize;
