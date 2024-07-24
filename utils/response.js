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
  { page, limit, totalPages, totalItems },
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
