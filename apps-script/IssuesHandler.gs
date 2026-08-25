// IssuesHandler.gs — Handlers for operational ticket trackers (12_Issues sheet).

function handleListIssues() {
  var repo = new SheetRepository("12_Issues", "ISS", "issueId");
  return repo.getAll();
}

function handleCreateIssue(data, operatorUserId) {
  if (!data || !data.issueTitle) {
    throw new Error("Invalid payload: issueTitle is required.");
  }
  var repo = new SheetRepository("12_Issues", "ISS", "issueId");
  var newRecord = {
    issueTitle: data.issueTitle,
    eventId: data.eventId || "",
    teamId: data.teamId || "",
    severity: data.severity || "MEDIUM",
    dateRaised: new Date(),
    actionRequired: data.actionRequired || "",
    ownerId: data.ownerId || "",
    deadline: data.deadline ? new Date(data.deadline) : "",
    resolution: data.resolution || "",
    status: data.status || "OPEN",
    createdBy: operatorUserId || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "issues.create", "Issues", inserted.issueId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateIssue(issueId, data, operatorUserId) {
  if (!issueId || !data) {
    throw new Error("Missing issue ID or update payload.");
  }
  var repo = new SheetRepository("12_Issues", "ISS", "issueId");
  var existing = repo.getById(issueId);
  if (!existing) {
    throw new Error("Issue ticket not found with ID: " + issueId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("issueTitle")) updateFields.issueTitle = data.issueTitle;
  if (data.hasOwnProperty("eventId")) updateFields.eventId = data.eventId;
  if (data.hasOwnProperty("teamId")) updateFields.teamId = data.teamId;
  if (data.hasOwnProperty("severity")) updateFields.severity = data.severity;
  if (data.hasOwnProperty("actionRequired")) updateFields.actionRequired = data.actionRequired;
  if (data.hasOwnProperty("ownerId")) updateFields.ownerId = data.ownerId;
  if (data.hasOwnProperty("deadline")) updateFields.deadline = data.deadline ? new Date(data.deadline) : "";
  if (data.hasOwnProperty("resolution")) updateFields.resolution = data.resolution;
  if (data.hasOwnProperty("status")) {
    updateFields.status = data.status;
    if (data.status === "RESOLVED" && !existing.resolution) {
      updateFields.resolution = data.resolution || "Resolved by operator.";
    }
  }

  var updated = repo.update(issueId, updateFields);

  if (data.hasOwnProperty("status") && data.status !== existing.status) {
    logAudit(operatorUserId, "issues.updateStatus", "Issues", issueId, existing.status, data.status, "SUCCESS");
  }

  return updated;
}
