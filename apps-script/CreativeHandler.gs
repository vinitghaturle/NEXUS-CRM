// CreativeHandler.gs — Handlers for Creative briefs and tracking (06_Creative sheet).

function handleListCreative() {
  var repo = new SheetRepository("06_Creative", "CRV", "creativeId");
  return repo.getAll();
}

function handleCreateCreative(data, operatorUserId) {
  if (!data || !data.title) {
    throw new Error("Invalid payload: title is required.");
  }
  var repo = new SheetRepository("06_Creative", "CRV", "creativeId");
  var newRecord = {
    eventId: data.eventId || "",
    creativeType: data.creativeType || "POSTER",
    title: data.title,
    designerId: data.designerId || "",
    contentOwnerId: data.contentOwnerId || "",
    contentReceived: data.contentReceived || "FALSE",
    designStarted: data.designStarted || "FALSE",
    reviewStatus: data.reviewStatus || "PENDING",
    approved: data.approved || "FALSE",
    published: data.published || "FALSE",
    deadline: data.deadline ? new Date(data.deadline) : "",
    postingDate: data.postingDate ? new Date(data.postingDate) : "",
    assetUrl: data.assetUrl || "",
    remarks: data.remarks || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "creative.create", "Creative", inserted.creativeId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateCreative(creativeId, data, operatorUserId) {
  if (!creativeId || !data) {
    throw new Error("Missing creative ID or update payload.");
  }
  var repo = new SheetRepository("06_Creative", "CRV", "creativeId");
  var existing = repo.getById(creativeId);
  if (!existing) {
    throw new Error("Creative not found with ID: " + creativeId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("eventId")) updateFields.eventId = data.eventId;
  if (data.hasOwnProperty("creativeType")) updateFields.creativeType = data.creativeType;
  if (data.hasOwnProperty("title")) updateFields.title = data.title;
  if (data.hasOwnProperty("designerId")) updateFields.designerId = data.designerId;
  if (data.hasOwnProperty("contentOwnerId")) updateFields.contentOwnerId = data.contentOwnerId;
  if (data.hasOwnProperty("contentReceived")) updateFields.contentReceived = data.contentReceived;
  if (data.hasOwnProperty("designStarted")) updateFields.designStarted = data.designStarted;
  if (data.hasOwnProperty("reviewStatus")) updateFields.reviewStatus = data.reviewStatus;
  if (data.hasOwnProperty("approved")) updateFields.approved = data.approved;
  if (data.hasOwnProperty("published")) updateFields.published = data.published;
  if (data.hasOwnProperty("deadline")) updateFields.deadline = data.deadline ? new Date(data.deadline) : "";
  if (data.hasOwnProperty("postingDate")) updateFields.postingDate = data.postingDate ? new Date(data.postingDate) : "";
  if (data.hasOwnProperty("assetUrl")) updateFields.assetUrl = data.assetUrl;
  if (data.hasOwnProperty("remarks")) updateFields.remarks = data.remarks;

  var updated = repo.update(creativeId, updateFields);

  // Audit review status change
  if (data.hasOwnProperty("reviewStatus") && data.reviewStatus !== existing.reviewStatus) {
    logAudit(operatorUserId, "creative.updateStatus", "Creative", creativeId, existing.reviewStatus, data.reviewStatus, "SUCCESS");
  }

  return updated;
}
