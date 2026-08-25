// RecognitionHandler.gs — Core handlers for volunteer recognition (15_Recognition sheet).

function handleListRecognition() {
  var repo = new SheetRepository("15_Recognition", "REC", "recognitionId");
  return repo.getAll();
}

function handleCreateRecognition(data, operatorUserId) {
  if (!data || !data.userId || !data.recognitionType) {
    throw new Error("Invalid payload: userId and recognitionType are required.");
  }
  var repo = new SheetRepository("15_Recognition", "REC", "recognitionId");

  var newRecord = {
    userId: data.userId,
    recognitionType: data.recognitionType,
    month: data.month || "",
    year: data.year || "",
    reason: data.reason || "",
    eventId: data.eventId || "",
    volunteerHours: Number(data.volunteerHours) || 0,
    approvedBy: operatorUserId || "",
    certificateUrl: data.certificateUrl || ""
  };

  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "recognition.create", "Recognition", inserted.recognitionId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateRecognition(recognitionId, data, operatorUserId) {
  if (!recognitionId || !data) {
    throw new Error("Missing recognition ID or update payload.");
  }
  var repo = new SheetRepository("15_Recognition", "REC", "recognitionId");
  var existing = repo.getById(recognitionId);
  if (!existing) {
    throw new Error("Recognition record not found with ID: " + recognitionId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("recognitionType")) updateFields.recognitionType = data.recognitionType;
  if (data.hasOwnProperty("month")) updateFields.month = data.month;
  if (data.hasOwnProperty("year")) updateFields.year = data.year;
  if (data.hasOwnProperty("reason")) updateFields.reason = data.reason;
  if (data.hasOwnProperty("eventId")) updateFields.eventId = data.eventId;
  if (data.hasOwnProperty("volunteerHours")) updateFields.volunteerHours = Number(data.volunteerHours) || 0;
  if (data.hasOwnProperty("certificateUrl")) updateFields.certificateUrl = data.certificateUrl;

  var updated = repo.update(recognitionId, updateFields);
  logAudit(operatorUserId, "recognition.update", "Recognition", recognitionId, existing, updated, "SUCCESS");
  return updated;
}
