const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (err) {
    const errors =
      err?.errors?.map((e) => ({
        field: e.path?.join("."),
        message: e.message,
      })) || [];

    return res.status(400).json({
      success: false,
      message: errors[0]?.message || "Validation error",
      errors,
    });
  }
};

module.exports = validate;
