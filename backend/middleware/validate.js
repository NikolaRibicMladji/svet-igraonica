const { ZodError } = require("zod");
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (!result.success) {
        return next(new ZodError(result.error.issues));
      }

      req.validated = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
