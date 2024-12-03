/**
 * src\utils\validator.js
 */

const Ajv = require('ajv');
const validator = new Ajv({ allErrors: true });
const addFormats = require("ajv-formats");

//
addFormats(validator)

/**
 * 
 * @param {*} schemaType 
 * @param {*} data 
 * @returns 
 */
function validateData(schemas, schemaType, data) {
  const schema = schemas[schemaType];

  if (!schema) {
    throw new Error(`No schema found for ${schemaType}`);
  }

  const validate = validator.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const formattedErrors = validate.errors.map(error => {
      const fieldPath = error.instancePath || 'Unknown field'; // Get the field path

      // Include the field path in the error message
      if (error.keyword === 'required') {
        return `${fieldPath}: The field is required but is missing in the provided data.`;
      } else if (error.keyword === 'additionalProperties') {
        return `${fieldPath}: Unexpected field. The field "${error.params.additionalProperty}" is not allowed.`;
      } else if (error.keyword === 'type') {
        return `${fieldPath}: Invalid type. Expected type "${error.schema}" but received "${typeof data[fieldPath]}"`;
      } else {
        return `${fieldPath}: ${error.message}`;
      }
    });

    formattedErrors.forEach(error => {
      console.error(`- ${error}`);
    });

    throw new Error(`Validation failed with the following errors for ${schemaType}: \n` + formattedErrors.join('\n')); // More detailed error output
  }

  // If no errors, return null indicating validation passed
  return null;
}

module.exports = { validateData };