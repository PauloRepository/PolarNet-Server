// validations/index.js
const authValidations = require('./auth.validation');
const clientValidations = require('./client.validation');
const providerValidations = require('./provider.validation');
const adminValidations = require('./admin.validation');
const { handleValidationErrors } = require('./common.validation');

module.exports = {
  auth: authValidations,
  client: clientValidations,
  provider: providerValidations,
  admin: adminValidations,
  handleValidationErrors
};
