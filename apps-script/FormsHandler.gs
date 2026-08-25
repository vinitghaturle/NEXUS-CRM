// FormsHandler.gs — Handlers for Forms registry and metadata tracking (11_Forms sheet).

function handleListForms() {
  var repo = new SheetRepository("11_Forms", "FRM", "formId");
  return repo.getAll();
}

function handleCreateForm(data, operatorUserId) {
  if (!data || !data.formName) {
    throw new Error("Invalid payload: formName is required.");
  }
  var repo = new SheetRepository("11_Forms", "FRM", "formId");
  var newRecord = {
    formName: data.formName,
    eventId: data.eventId || "",
    ownerId: data.ownerId || "",
    creationDeadline: data.creationDeadline ? new Date(data.creationDeadline) : "",
    launchDate: data.launchDate ? new Date(data.launchDate) : "",
    closingDate: data.closingDate ? new Date(data.closingDate) : "",
    responseCount: Number(data.responseCount) || 0,
    status: data.status || "PLANNING",
    formUrl: data.formUrl || "",
    responseSheetUrl: data.responseSheetUrl || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "forms.create", "Forms", inserted.formId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateForm(formId, data, operatorUserId) {
  if (!formId || !data) {
    throw new Error("Missing form ID or update payload.");
  }
  var repo = new SheetRepository("11_Forms", "FRM", "formId");
  var existing = repo.getById(formId);
  if (!existing) {
    throw new Error("Form registry not found with ID: " + formId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("formName")) updateFields.formName = data.formName;
  if (data.hasOwnProperty("eventId")) updateFields.eventId = data.eventId;
  if (data.hasOwnProperty("ownerId")) updateFields.ownerId = data.ownerId;
  if (data.hasOwnProperty("creationDeadline")) updateFields.creationDeadline = data.creationDeadline ? new Date(data.creationDeadline) : "";
  if (data.hasOwnProperty("launchDate")) updateFields.launchDate = data.launchDate ? new Date(data.launchDate) : "";
  if (data.hasOwnProperty("closingDate")) updateFields.closingDate = data.closingDate ? new Date(data.closingDate) : "";
  if (data.hasOwnProperty("responseCount")) updateFields.responseCount = Number(data.responseCount) || 0;
  if (data.hasOwnProperty("status")) updateFields.status = data.status;
  if (data.hasOwnProperty("formUrl")) updateFields.formUrl = data.formUrl;
  if (data.hasOwnProperty("responseSheetUrl")) updateFields.responseSheetUrl = data.responseSheetUrl;

  var updated = repo.update(formId, updateFields);
  return updated;
}
