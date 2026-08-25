// MeetingsHandler.gs — Handlers for log meeting notes replacing WhatsApp (13_Meetings sheet).

function handleListMeetings() {
  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  return repo.getAll();
}

function handleCreateMeeting(data, operatorUserId) {
  if (!data || !data.agenda) {
    throw new Error("Invalid payload: agenda is required.");
  }
  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  var newRecord = {
    meetingDate: data.meetingDate ? new Date(data.meetingDate) : new Date(),
    meetingType: data.meetingType || "GENERAL",
    agenda: data.agenda,
    decision: data.decision || "",
    responsiblePerson: data.responsiblePerson || "",
    deadline: data.deadline ? new Date(data.deadline) : "",
    status: data.status || "OPEN",
    remarks: data.remarks || "",
    createdBy: operatorUserId || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "meetings.create", "Meetings", inserted.meetingId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateMeeting(meetingId, data, operatorUserId) {
  if (!meetingId || !data) {
    throw new Error("Missing meeting ID or update payload.");
  }
  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  var existing = repo.getById(meetingId);
  if (!existing) {
    throw new Error("Meeting log not found with ID: " + meetingId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("meetingDate")) updateFields.meetingDate = data.meetingDate ? new Date(data.meetingDate) : "";
  if (data.hasOwnProperty("meetingType")) updateFields.meetingType = data.meetingType;
  if (data.hasOwnProperty("agenda")) updateFields.agenda = data.agenda;
  if (data.hasOwnProperty("decision")) updateFields.decision = data.decision;
  if (data.hasOwnProperty("responsiblePerson")) updateFields.responsiblePerson = data.responsiblePerson;
  if (data.hasOwnProperty("deadline")) updateFields.deadline = data.deadline ? new Date(data.deadline) : "";
  if (data.hasOwnProperty("status")) updateFields.status = data.status;
  if (data.hasOwnProperty("remarks")) updateFields.remarks = data.remarks;

  var updated = repo.update(meetingId, updateFields);
  return updated;
}
