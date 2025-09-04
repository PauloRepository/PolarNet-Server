/**
 * Helper para manejar respuestas estandarizadas de la API
 * Basado en el patrón usado en Oracle con mensajeError y mensajeAviso
 */

const responseHandler = {
  /**
   * Respuesta exitosa
   * @param {Object} res - Response object de Express
   * @param {Object} data - Datos a enviar
   * @param {string} mensajeAviso - Mensaje informativo (opcional)
   * @param {number} statusCode - Código HTTP (default: 200)
   */
  success: (res, data = null, mensajeAviso = null, statusCode = 200) => {
    const response = {
      success: true,
      mensajeError: null,
      mensajeAviso: mensajeAviso,
      data: data,
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json(response);
  },

  /**
   * Respuesta de error
   * @param {Object} res - Response object de Express  
   * @param {string} mensajeError - Mensaje de error
   * @param {string} code - Código de error (opcional)
   * @param {number} statusCode - Código HTTP (default: 500)
   * @param {Object} details - Detalles adicionales (opcional)
   */
  error: (res, mensajeError, code = null, statusCode = 500, details = null) => {
    const response = {
      success: false,
      mensajeError: mensajeError,
      mensajeAviso: null,
      code: code,
      data: null,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  },

  /**
   * Respuesta de validación (errores de entrada)
   * @param {Object} res - Response object de Express
   * @param {Array} validationErrors - Errores de validación de express-validator
   */
  validationError: (res, validationErrors) => {
    return res.status(400).json({
      success: false,
      mensajeError: 'Datos de entrada inválidos',
      mensajeAviso: null,
      code: 'VALIDATION_ERROR',
      data: null,
      details: validationErrors,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Respuesta de no autorizado
   * @param {Object} res - Response object de Express
   * @param {string} mensajeError - Mensaje de error específico
   * @param {string} code - Código específico
   */
  unauthorized: (res, mensajeError = 'No autorizado', code = 'UNAUTHORIZED') => {
    return res.status(401).json({
      success: false,
      mensajeError: mensajeError,
      mensajeAviso: null,
      code: code,
      data: null,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Respuesta de no encontrado
   * @param {Object} res - Response object de Express
   * @param {string} mensajeError - Mensaje específico
   */
  notFound: (res, mensajeError = 'Recurso no encontrado') => {
    return res.status(404).json({
      success: false,
      mensajeError: mensajeError,
      mensajeAviso: null,
      code: 'NOT_FOUND',
      data: null,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Respuesta de conflicto (datos duplicados, etc.)
   * @param {Object} res - Response object de Express
   * @param {string} mensajeError - Mensaje específico
   * @param {string} code - Código específico
   */
  conflict: (res, mensajeError, code = 'CONFLICT') => {
    return res.status(409).json({
      success: false,
      mensajeError: mensajeError,
      mensajeAviso: null,
      code: code,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = responseHandler;
