// DocumentsHandler.gs — Handlers for Google Drive documents indexing (16_Documents sheet).

function handleListDocuments() {
  var repo = new SheetRepository("16_Documents", "DOC", "documentId");
  return repo.getAll();
}

function handleCreateDocument(data, operatorUserId) {
  if (!data || !data.documentName || !data.driveUrl) {
    throw new Error("Invalid payload: documentName and driveUrl are required.");
  }
  var repo = new SheetRepository("16_Documents", "DOC", "documentId");
  var newRecord = {
    eventId: data.eventId || "",
    documentType: data.documentType || "OTHER",
    documentName: data.documentName,
    driveUrl: data.driveUrl,
    uploadedBy: operatorUserId || "",
    uploadedAt: new Date(),
    description: data.description || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "documents.create", "Documents", inserted.documentId, "", inserted, "SUCCESS");
  return inserted;
}
