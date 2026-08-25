// SocialHandler.gs — Handlers for Social Media content planner (07_Social_Media sheet).

function handleListSocial() {
  var repo = new SheetRepository("07_Social_Media", "SOC", "contentId");
  return repo.getAll();
}

function handleCreateSocial(data, operatorUserId) {
  if (!data || !data.title) {
    throw new Error("Invalid payload: title is required.");
  }
  var repo = new SheetRepository("07_Social_Media", "SOC", "contentId");
  var newRecord = {
    contentType: data.contentType || "POST",
    eventId: data.eventId || "",
    title: data.title,
    platform: data.platform || "INSTAGRAM",
    responsiblePerson: data.responsiblePerson || "",
    contentDeadline: data.contentDeadline ? new Date(data.contentDeadline) : "",
    designDeadline: data.designDeadline ? new Date(data.designDeadline) : "",
    approvalStatus: data.approvalStatus || "PENDING",
    postingDate: data.postingDate ? new Date(data.postingDate) : "",
    status: data.status || "PLANNING",
    publishedUrl: data.publishedUrl || "",
    remarks: data.remarks || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "social.create", "SocialMedia", inserted.contentId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateSocial(contentId, data, operatorUserId) {
  if (!contentId || !data) {
    throw new Error("Missing content ID or update payload.");
  }
  var repo = new SheetRepository("07_Social_Media", "SOC", "contentId");
  var existing = repo.getById(contentId);
  if (!existing) {
    throw new Error("Social Media post not found with ID: " + contentId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("contentType")) updateFields.contentType = data.contentType;
  if (data.hasOwnProperty("eventId")) updateFields.eventId = data.eventId;
  if (data.hasOwnProperty("title")) updateFields.title = data.title;
  if (data.hasOwnProperty("platform")) updateFields.platform = data.platform;
  if (data.hasOwnProperty("responsiblePerson")) updateFields.responsiblePerson = data.responsiblePerson;
  if (data.hasOwnProperty("contentDeadline")) updateFields.contentDeadline = data.contentDeadline ? new Date(data.contentDeadline) : "";
  if (data.hasOwnProperty("designDeadline")) updateFields.designDeadline = data.designDeadline ? new Date(data.designDeadline) : "";
  if (data.hasOwnProperty("approvalStatus")) updateFields.approvalStatus = data.approvalStatus;
  if (data.hasOwnProperty("postingDate")) updateFields.postingDate = data.postingDate ? new Date(data.postingDate) : "";
  if (data.hasOwnProperty("status")) updateFields.status = data.status;
  if (data.hasOwnProperty("publishedUrl")) updateFields.publishedUrl = data.publishedUrl;
  if (data.hasOwnProperty("remarks")) updateFields.remarks = data.remarks;

  var updated = repo.update(contentId, updateFields);

  // Audit approval status changes
  if (data.hasOwnProperty("approvalStatus") && data.approvalStatus !== existing.approvalStatus) {
    logAudit(operatorUserId, "social.updateApproval", "SocialMedia", contentId, existing.approvalStatus, data.approvalStatus, "SUCCESS");
  }

  return updated;
}
