const successResponse = (
  res,
  data = null,
  message = "Uspešno",
  status = 200,
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = "Greška", status = 500) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
