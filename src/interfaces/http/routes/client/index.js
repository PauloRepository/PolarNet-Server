/**
 * Client Routes Index - Entry Point
 * Punto de entrada principal para todas las rutas CLIENT
 */
const express = require('express');
const router = express.Router();

// Import and use all client routes from client.routes.js
// (Authentication is already handled in client.routes.js)
const clientRoutes = require('./client.routes');
router.use('/', clientRoutes);

module.exports = router;
