const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

// Validaciones para administrador
const adminValidation = [
  body('admin_password')
    .notEmpty()
    .withMessage('La contraseña de administrador es requerida')
    .isLength({ min: 5 })
    .withMessage('La contraseña debe tener al menos 5 caracteres')
];

// Rutas de administrador (requieren contraseña especial)
router.post('/users', adminValidation, adminController.getAllUsers);
router.post('/db-status', adminValidation, adminController.checkDatabaseConnection);

module.exports = router;
