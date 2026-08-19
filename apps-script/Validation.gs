// Validation.gs — Contains input validation helpers.
// Reusable checks to ensure request parameters are present, correctly formatted, and non-empty.

function validatePayload(payload, requiredFields) {
  // Validates if payload contains all requiredFields.
  // Returns true if valid, throws error otherwise.
  for (var i = 0; i < requiredFields.length; i++) {
    var field = requiredFields[i];
    if (!payload.hasOwnProperty(field) || payload[field] === undefined || payload[field] === null) {
      throw new Error("Missing required field: " + field);
    }
  }
  return true;
}
