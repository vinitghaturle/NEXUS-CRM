// AchievementsHandler.gs — Handlers for student/faculty achievements ledger (10_Achievements sheet).

function handleListAchievements() {
  var repo = new SheetRepository("10_Achievements", "ACH", "achievementId");
  return repo.getAll();
}

function handleCreateAchievement(data, operatorUserId) {
  if (!data || !data.name || !data.achievement) {
    throw new Error("Invalid payload: name and achievement are required.");
  }
  var repo = new SheetRepository("10_Achievements", "ACH", "achievementId");
  var newRecord = {
    name: data.name,
    department: data.department || "",
    achievement: data.achievement,
    category: data.category || "STUDENT",
    achievementDate: data.achievementDate ? new Date(data.achievementDate) : "",
    proofUrl: data.proofUrl || "",
    contentWriterId: data.contentWriterId || "",
    designerId: data.designerId || "",
    approvalStatus: data.approvalStatus || "PENDING",
    postingDate: data.postingDate ? new Date(data.postingDate) : "",
    instagramUrl: data.instagramUrl || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "achievements.create", "Achievements", inserted.achievementId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateAchievement(achievementId, data, operatorUserId) {
  if (!achievementId || !data) {
    throw new Error("Missing achievement ID or update payload.");
  }
  var repo = new SheetRepository("10_Achievements", "ACH", "achievementId");
  var existing = repo.getById(achievementId);
  if (!existing) {
    throw new Error("Achievement record not found with ID: " + achievementId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("name")) updateFields.name = data.name;
  if (data.hasOwnProperty("department")) updateFields.department = data.department;
  if (data.hasOwnProperty("achievement")) updateFields.achievement = data.achievement;
  if (data.hasOwnProperty("category")) updateFields.category = data.category;
  if (data.hasOwnProperty("achievementDate")) updateFields.achievementDate = data.achievementDate ? new Date(data.achievementDate) : "";
  if (data.hasOwnProperty("proofUrl")) updateFields.proofUrl = data.proofUrl;
  if (data.hasOwnProperty("contentWriterId")) updateFields.contentWriterId = data.contentWriterId;
  if (data.hasOwnProperty("designerId")) updateFields.designerId = data.designerId;
  if (data.hasOwnProperty("approvalStatus")) updateFields.approvalStatus = data.approvalStatus;
  if (data.hasOwnProperty("postingDate")) updateFields.postingDate = data.postingDate ? new Date(data.postingDate) : "";
  if (data.hasOwnProperty("instagramUrl")) updateFields.instagramUrl = data.instagramUrl;

  var updated = repo.update(achievementId, updateFields);
  
  if (data.hasOwnProperty("approvalStatus") && data.approvalStatus !== existing.approvalStatus) {
    logAudit(operatorUserId, "achievements.approve", "Achievements", achievementId, existing.approvalStatus, data.approvalStatus, "SUCCESS");
  }

  return updated;
}
