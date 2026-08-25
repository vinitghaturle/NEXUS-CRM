// BirthdaysHandler.gs — Handlers for Faculty and Member Birthdays (09_Birthdays sheet).

function handleListBirthdays() {
  var repo = new SheetRepository("09_Birthdays", "BDY", "birthdayId");
  return repo.getAll();
}

function handleCreateBirthday(data, operatorUserId) {
  if (!data || !data.facultyName) {
    throw new Error("Invalid payload: facultyName is required.");
  }
  var repo = new SheetRepository("09_Birthdays", "BDY", "birthdayId");
  var newRecord = {
    facultyName: data.facultyName,
    department: data.department || "",
    birthday: data.birthday ? new Date(data.birthday) : "",
    month: data.month || "",
    posterAssigned: data.posterAssigned || "",
    contentAssigned: data.contentAssigned || "",
    designDeadline: data.designDeadline ? new Date(data.designDeadline) : "",
    approvalStatus: data.approvalStatus || "PENDING",
    postingDate: data.postingDate ? new Date(data.postingDate) : "",
    status: data.status || "PLANNING",
    remarks: data.remarks || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "birthdays.create", "Birthdays", inserted.birthdayId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateBirthday(birthdayId, data, operatorUserId) {
  if (!birthdayId || !data) {
    throw new Error("Missing birthday ID or update payload.");
  }
  var repo = new SheetRepository("09_Birthdays", "BDY", "birthdayId");
  var existing = repo.getById(birthdayId);
  if (!existing) {
    throw new Error("Birthday record not found with ID: " + birthdayId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("facultyName")) updateFields.facultyName = data.facultyName;
  if (data.hasOwnProperty("department")) updateFields.department = data.department;
  if (data.hasOwnProperty("birthday")) updateFields.birthday = data.birthday ? new Date(data.birthday) : "";
  if (data.hasOwnProperty("month")) updateFields.month = data.month;
  if (data.hasOwnProperty("posterAssigned")) updateFields.posterAssigned = data.posterAssigned;
  if (data.hasOwnProperty("contentAssigned")) updateFields.contentAssigned = data.contentAssigned;
  if (data.hasOwnProperty("designDeadline")) updateFields.designDeadline = data.designDeadline ? new Date(data.designDeadline) : "";
  if (data.hasOwnProperty("approvalStatus")) updateFields.approvalStatus = data.approvalStatus;
  if (data.hasOwnProperty("postingDate")) updateFields.postingDate = data.postingDate ? new Date(data.postingDate) : "";
  if (data.hasOwnProperty("status")) updateFields.status = data.status;
  if (data.hasOwnProperty("remarks")) updateFields.remarks = data.remarks;

  var updated = repo.update(birthdayId, updateFields);
  return updated;
}
