const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      result.error.statusCode = 422;
      return next(result.error);
    }

    req.validated = {
      body: result.data.body || {},
      params: result.data.params || {},
      query: result.data.query || {},
    };

    return next();
  };
};

module.exports = validate;
