const ErrorResponse = require("../model/error_response");
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message;
    res.status(err.statusCode).json(new ErrorResponse(err.message, null).toJSON());
};