// MeetingsHandler.gs — Handlers for Meeting Scheduling, Agendas & MoM Logs (13_Meetings sheet).

/**
 * Returns all meeting records.
 * @returns {Array<Object>} List of meetings
 */
function handleListMeetings() {
  try {
    fixMeetingColumnAlignment();
  } catch (e) {}
  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  return repo.getAll();
}

/**
 * Retrieves details for a single meeting by ID.
 * @param {string} meetingId - Unique ID of the meeting
 * @returns {Object} The meeting details
 */
function handleGetMeeting(meetingId) {
  if (!meetingId) {
    throw new Error("Missing meeting ID.");
  }
  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  var meeting = repo.getById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found with ID: " + meetingId);
  }
  return meeting;
}

/**
 * Schedules a new meeting, assigns MoM recorder, and broadcasts invitations.
 * @param {Object} data - Meeting payload
 * @param {string} operatorUserId - Creator user ID (Admin / VP / President)
 * @returns {Object} Newly scheduled meeting record
 */
function handleCreateMeeting(data, operatorUserId) {
  if (!data || (!data.agenda && !data.title)) {
    throw new Error("Invalid payload: meeting title and agenda are required.");
  }

  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");

  // Resolve MoM Assignee Name if ID provided
  var momAssigneeName = data.momAssigneeName || "";
  if (data.momAssigneeId && !momAssigneeName) {
    try {
      var userRepo = new SheetRepository("01_Users", "USR", "userId");
      var u = userRepo.getById(data.momAssigneeId);
      if (u) momAssigneeName = u.name;
    } catch (e) {}
  }

  var meetingDateObj = data.meetingDate ? new Date(data.meetingDate) : new Date();

  var newRecord = {
    title: data.title || data.agenda,
    meetingDate: meetingDateObj,
    startTime: data.startTime || "10:00 AM",
    endTime: data.endTime || "",
    meetingType: data.meetingType || "GENERAL",
    location: data.location || data.driveLink || "",
    agenda: data.agenda || data.title,
    decision: data.decision || "",
    responsiblePerson: data.momAssigneeId || data.responsiblePerson || "",
    momAssigneeId: data.momAssigneeId || data.responsiblePerson || "",
    momAssigneeName: momAssigneeName,
    momDocUrl: data.momDocUrl || "",
    deadline: data.deadline ? new Date(data.deadline) : "",
    targetTeamIds: data.targetTeamIds || "ALL",
    status: data.status || "SCHEDULED",
    remarks: data.remarks || "",
    reminderSent: "FALSE",
    createdBy: operatorUserId || "",
    createdAt: new Date()
  };

  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "meetings.create", "Meetings", inserted.meetingId, "", inserted, "SUCCESS");

  // 1. Dispatch Email Invitation to invited participants
  try {
    sendMeetingInvitations(inserted, operatorUserId);
  } catch (err) {
    Logger.log("Meeting invitation dispatch error: " + err.toString());
  }

  return inserted;
}

/**
 * Updates an existing meeting record, agenda, MoM Google Doc link, or resolution status.
 * @param {string} meetingId - Meeting ID
 * @param {Object} data - Updated attributes
 * @param {string} operatorUserId - Updating user ID
 * @returns {Object} Updated meeting record
 */
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
  if (data.hasOwnProperty("title")) updateFields.title = data.title;
  if (data.hasOwnProperty("meetingDate")) updateFields.meetingDate = data.meetingDate ? new Date(data.meetingDate) : "";
  if (data.hasOwnProperty("startTime")) updateFields.startTime = data.startTime;
  if (data.hasOwnProperty("endTime")) updateFields.endTime = data.endTime;
  if (data.hasOwnProperty("meetingType")) updateFields.meetingType = data.meetingType;
  if (data.hasOwnProperty("location")) updateFields.location = data.location;
  if (data.hasOwnProperty("agenda")) updateFields.agenda = data.agenda;
  if (data.hasOwnProperty("decision")) updateFields.decision = data.decision;
  
  if (data.hasOwnProperty("momAssigneeId") || data.hasOwnProperty("responsiblePerson")) {
    var newAssigneeId = data.momAssigneeId || data.responsiblePerson;
    updateFields.momAssigneeId = newAssigneeId;
    updateFields.responsiblePerson = newAssigneeId;
    try {
      var userRepo = new SheetRepository("01_Users", "USR", "userId");
      var u = userRepo.getById(newAssigneeId);
      if (u) updateFields.momAssigneeName = u.name;
    } catch (e) {}
  }
  
  if (data.hasOwnProperty("momDocUrl")) updateFields.momDocUrl = data.momDocUrl;
  if (data.hasOwnProperty("deadline")) updateFields.deadline = data.deadline ? new Date(data.deadline) : "";
  if (data.hasOwnProperty("targetTeamIds")) updateFields.targetTeamIds = data.targetTeamIds;
  if (data.hasOwnProperty("status")) updateFields.status = data.status;
  if (data.hasOwnProperty("remarks")) updateFields.remarks = data.remarks;

  var updated = repo.update(meetingId, updateFields);
  logAudit(operatorUserId, "meetings.update", "Meetings", meetingId, existing, updated, "SUCCESS");

  return updated;
}

/**
 * Sends meeting schedule notifications to target users or entire organization.
 */
function sendMeetingInvitations(meetingRecord, operatorUserId) {
  var usersRepo = new SheetRepository("01_Users", "USR", "userId");
  var allUsers = usersRepo.getAll();
  
  var targetUsers = [];
  var targetTeamIds = String(meetingRecord.targetTeamIds || "ALL").trim();

  if (targetTeamIds === "ALL" || targetTeamIds === "") {
    targetUsers = allUsers.filter(function(u) { return u.status !== "INACTIVE" && u.email; });
  } else {
    var teamIdList = targetTeamIds.split(",").map(function(s) { return s.trim(); });
    targetUsers = allUsers.filter(function(u) {
      return u.status !== "INACTIVE" && u.email && (teamIdList.indexOf(u.teamId) !== -1 || u.role === "ADMIN" || u.role === "PRESIDENT" || u.role === "VP");
    });
  }

  // Dispatch MEETING_SCHEDULED to each target user
  for (var i = 0; i < targetUsers.length; i++) {
    var user = targetUsers[i];
    sendNotification("MEETING_SCHEDULED", {
      taskId: meetingRecord.meetingId,
      taskTitle: meetingRecord.title || meetingRecord.agenda,
      meetingDate: meetingRecord.meetingDate,
      startTime: meetingRecord.startTime,
      endTime: meetingRecord.endTime,
      location: meetingRecord.location,
      agenda: meetingRecord.agenda,
      meetingType: meetingRecord.meetingType,
      momAssigneeName: meetingRecord.momAssigneeName || "Designated Member"
    }, user.userId, {
      operatorName: "Executive Team",
      isMomAssignee: (user.userId === meetingRecord.momAssigneeId)
    });
  }

  // Special notification for the assigned MoM writer
  if (meetingRecord.momAssigneeId) {
    sendNotification("MOM_ASSIGNED", {
      taskId: meetingRecord.meetingId,
      taskTitle: meetingRecord.title || meetingRecord.agenda,
      meetingDate: meetingRecord.meetingDate,
      startTime: meetingRecord.startTime,
      location: meetingRecord.location,
      agenda: meetingRecord.agenda,
      meetingType: meetingRecord.meetingType
    }, meetingRecord.momAssigneeId, {
      operatorName: "Executive Team"
    });
  }
}

/**
 * Scheduled trigger function: checks for upcoming meetings in the next 60 minutes
 * and sends reminder emails to all participants.
 */
function checkAndSendMeetingReminders() {
  var repo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  var allMeetings = repo.getAll();
  var now = new Date();
  var oneHourFromNow = new Date(now.getTime() + 65 * 60 * 1000); // 65 min window

  for (var i = 0; i < allMeetings.length; i++) {
    var m = allMeetings[i];
    if (m.status === "SCHEDULED" && m.reminderSent !== "TRUE" && m.meetingDate) {
      var mDate = new Date(m.meetingDate);
      
      // Check if meeting is scheduled within the next hour
      if (mDate >= now && mDate <= oneHourFromNow) {
        Logger.log("Sending 1-hour reminder for meeting: " + m.meetingId);
        
        var usersRepo = new SheetRepository("01_Users", "USR", "userId");
        var allUsers = usersRepo.getAll();
        var targetUsers = allUsers.filter(function(u) { return u.status !== "INACTIVE" && u.email; });

        for (var j = 0; j < targetUsers.length; j++) {
          sendNotification("MEETING_REMINDER_1H", {
            taskId: m.meetingId,
            taskTitle: m.title || m.agenda,
            meetingDate: m.meetingDate,
            startTime: m.startTime,
            location: m.location,
            agenda: m.agenda,
            meetingType: m.meetingType
          }, targetUsers[j].userId);
        }

        // Mark reminderSent as TRUE
        repo.update(m.meetingId, { reminderSent: "TRUE" });
      }
    }
  }
}
