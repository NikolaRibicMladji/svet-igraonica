const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next();
  } catch (e) {
    return res.status(400).json({
      success: false,
      errors: (e.issues || []).map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    });
  }
};

module.exports = validate;
