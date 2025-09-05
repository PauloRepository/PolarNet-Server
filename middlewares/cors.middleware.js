// middlewares/cors.middleware.js
const cors = require('cors');

// Orígenes permitidos para CORS
const allowedOrigins = [
  "capacitor://localhost",
  "ionic://localhost", 
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:3200",
  "http://localhost:4200",
  "http://localhost:8000",
  "http://localhost:8080",
  "http://localhost:8100",
  process.env.CORS_ORIGIN || "*"
];

// Middleware CORS manual para máxima compatibilidad
const corsHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  res.header(
    "Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  
  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// Middleware CORS con librería como respaldo
const corsLibrary = cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      console.log(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Permitir de todos modos en desarrollo
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true
});

module.exports = {
  corsHeaders,
  corsLibrary,
  allowedOrigins
};
