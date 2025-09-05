// middlewares/logging.middleware.js

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

// Middleware para logging más detallado (desarrollo)
const detailedLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.status} - ${logData.duration}`);
  });
  
  next();
};

// Middleware para logging de errores
const errorLogger = (error, req, res, next) => {
  console.error('=== ERROR LOG ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Method:', req.method);
  console.error('URL:', req.originalUrl);
  console.error('IP:', req.ip || req.connection.remoteAddress);
  console.error('User-Agent:', req.get('User-Agent'));
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('================');
  next(error);
};

module.exports = {
  requestLogger,
  detailedLogger,
  errorLogger
};
