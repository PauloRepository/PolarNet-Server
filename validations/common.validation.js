// validations/common.validation.js
const { validationResult } = require('express-validator');
const responseHandler = require('../helpers/responseHandler');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return responseHandler.validationError(res, 'Errores de validación', errorMessages);
  }
  
  next();
};

// Validaciones comunes reutilizables
const commonValidations = {
  // Validación para IDs
  id: {
    param: 'id',
    in: ['params'],
    isInt: {
      options: { min: 1 },
      errorMessage: 'El ID debe ser un número entero positivo'
    }
  },

  // Validaciones para paginación
  pagination: {
    limit: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1, max: 100 },
        errorMessage: 'El límite debe ser un número entre 1 y 100'
      }
    },
    offset: {
      in: ['query'], 
      optional: true,
      isInt: {
        options: { min: 0 },
        errorMessage: 'El offset debe ser un número mayor o igual a 0'
      }
    }
  }
};

module.exports = {
  handleValidationErrors,
  commonValidations
};
