const ROLES = require("../constants/roles");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const error = new Error("Nemate dozvolu za ovu akciju");
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

module.exports = authorize;
