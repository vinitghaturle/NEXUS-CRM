// Response.gs — Standardizes API response formatting.
// Ensures consistent success and error payloads.

function responseSuccess(data) {
  var output = {
    status: "success",
    data: data
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function responseError(code, message) {
  var output = {
    status: "error",
    error: {
      code: code,
      message: message
    }
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
