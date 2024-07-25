export const apiResponseErr = (data, success, responseCode, errMessage, res) => {
  return res.status(responseCode).send({
    data: data,
    success: success,
    responseCode: responseCode,
    errMessage: errMessage ?? 'Something went wrong',
  });
};
export const apiResponseSuccess = (data, success, successCode, message, res) => {
  return res.status(successCode).send({
    data: data,
    success: success,
    successCode: successCode,
    message: message,
  });
};

export const apiResponsePagination = (
  data,
  success,
  successCode,
  message,
  { page=0, limit=0, totalPages=0, totalItems=0 },
  res,
) => {
  return res.status(successCode).send({
    data: data,
    success: success,
    successCode: successCode,
    message: message,
    pagination: {
      page: page,
      limit: limit,
      totalPages: totalPages,
      totalItems: totalItems,
    },
  });
};
