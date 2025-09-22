/**
 * Client Routes Index - Entry Point
 * Punto de entrada principal para todas las rutas CLIENT
 */
const express = require('express');
const router = express.Router();

// Import and use all provider routes from provider.routes.js
// (Authentication is already handled in provider.routes.js)
const providerRoutes = require('./provider.routes');
router.use('/', providerRoutes);

module.exports = router;
