function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  const statusCode = parseInt(err.statusCode, 10) || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
