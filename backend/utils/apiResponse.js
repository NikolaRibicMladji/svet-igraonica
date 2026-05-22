const successResponse = (
  res,
  data = null,
  message = "Uspešno",
  status = 200,
  meta = null,
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...(meta && { meta }),
  });
};

module.exports = {
  successResponse,
};
