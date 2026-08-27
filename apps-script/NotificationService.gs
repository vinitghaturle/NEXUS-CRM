// NotificationService.gs — Centralized transactional email & notification engine for NEXUS CRM & Capacitor App.
// Responsible for event detection, recipient resolution, templating, deep-linking CTA buttons, and failure-isolated dispatch.

/**
 * Dispatches an automated email notification based on task lifecycle or meeting events.
 * Safe side-effect: will never throw or interrupt the caller's main transaction.
 * 
 * @param {string} eventType - One of: TASK_ASSIGNED, TASK_REASSIGNED, TASK_READY_FOR_VERIFICATION, TASK_VERIFIED, TASK_REJECTED, TASK_BLOCKED, MEETING_SCHEDULED, MEETING_REMINDER_1H, MOM_ASSIGNED
 * @param {Object} entityRecord - The task or meeting entity
 * @param {string} recipientUserIdOrUid - The user ID or UID of the target recipient
 * @param {Object} [extraData] - Optional context: { rejectionRemark, blockReason, remarks, operatorName, isMomAssignee, ... }
 */
function sendNotification(eventType, entityRecord, recipientUserIdOrUid, extraData) {
  if (!entityRecord || !eventType) return;
  extraData = extraData || {};

  try {
    // 1. Resolve recipient user
    var recipient = resolveNotificationRecipient(recipientUserIdOrUid);
    if (!recipient || !recipient.email) {
      logNotificationEntry({
        eventType: eventType,
        taskId: entityRecord.taskId || entityRecord.meetingId || "",
        eventId: entityRecord.eventId || "",
        recipientUserId: recipientUserIdOrUid || "UNKNOWN",
        recipientEmail: recipient ? recipient.email : "MISSING",
        subject: "N/A",
        status: "SKIPPED",
        errorMessage: "Recipient user not found or missing valid email address."
      });
      return;
    }

    // 2. Resolve additional metadata (Event name, Team name, Assigner/Verifier name)
    var contextData = resolveNotificationContext(entityRecord, extraData);

    // 3. Build Email Template (Subject, HTML, Plaintext)
    var template = buildEmailTemplate(eventType, entityRecord, recipient, contextData, extraData);
    if (!template) {
      logNotificationEntry({
        eventType: eventType,
        taskId: entityRecord.taskId || entityRecord.meetingId || "",
        eventId: entityRecord.eventId || "",
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        subject: "N/A",
        status: "SKIPPED",
        errorMessage: "No template mapped for eventType: " + eventType
      });
      return;
    }

    // 4. Duplicate Protection: Check if identical notification was sent in the last 60 seconds
    var entityId = entityRecord.taskId || entityRecord.meetingId || "GEN";
    if (isDuplicateNotification(entityId, eventType, recipient.userId)) {
      Logger.log("Duplicate notification suppressed: " + eventType + " for " + entityId);
      return;
    }

    // 5. Send Email via MailApp
    MailApp.sendEmail({
      to: recipient.email,
      subject: template.subject,
      body: template.plainBody,
      htmlBody: template.htmlBody
    });

    // 6. Log Successful Dispatch
    logNotificationEntry({
      eventType: eventType,
      taskId: entityRecord.taskId || entityRecord.meetingId || "",
      eventId: entityRecord.eventId || "",
      recipientUserId: recipient.userId,
      recipientEmail: recipient.email,
      subject: template.subject,
      status: "SENT",
      sentAt: new Date()
    });

    Logger.log("Notification [" + eventType + "] successfully sent to " + recipient.email);

  } catch (err) {
    Logger.log("NotificationService error: " + err.toString());
    logNotificationEntry({
      eventType: eventType,
      taskId: (entityRecord.taskId || entityRecord.meetingId || ""),
      eventId: entityRecord.eventId || "",
      recipientUserId: recipientUserIdOrUid || "",
      recipientEmail: (recipient && recipient.email) ? recipient.email : "",
      subject: (template && template.subject) ? template.subject : "",
      status: "FAILED",
      errorMessage: err.toString()
    });
  }
}

/**
 * Resolves a User record (userId, name, email) from 01_Users sheet.
 */
function resolveNotificationRecipient(userIdOrUid) {
  if (!userIdOrUid) return null;
  
  var usersRepo = new SheetRepository("01_Users", "USR", "userId");
  
  if (userIdOrUid.indexOf("USR-") === 0) {
    var user = usersRepo.getById(userIdOrUid);
    if (user && user.email) return user;
  }
  
  var matches = usersRepo.find({ firebaseUid: userIdOrUid });
  if (matches.length > 0 && matches[0].email) {
    return matches[0];
  }
  
  if (userIdOrUid.indexOf("@") !== -1) {
    var byEmail = usersRepo.find({ email: userIdOrUid });
    if (byEmail.length > 0) return byEmail[0];
    return { userId: "EXTERNAL", name: "Team Member", email: userIdOrUid };
  }
  
  return null;
}

/**
 * Resolves contextual Event Name, Team Name, and Assigner Name for templates.
 */
function resolveNotificationContext(record, extraData) {
  var context = {
    eventName: "General Operations",
    teamName: extraData.teamName || "General Department",
    assignedByName: extraData.operatorName || "NEXUS Administrator",
    verifierName: "Operations Lead",
    ownerName: "Team Member",
    appUrl: "http://localhost:5173" // Default fallback URL
  };

  try {
    var settingsRepo = new SheetRepository("00_Settings", null, "settingKey");
    var appUrlSetting = settingsRepo.getById("PORTAL_BASE_URL");
    if (appUrlSetting && appUrlSetting.settingValue) {
      context.appUrl = appUrlSetting.settingValue.replace(/\/$/, "");
    }
  } catch (e) {}

  if (record.eventId) {
    try {
      var eventsRepo = new SheetRepository("03_Events", "EVT", "eventId");
      var eventObj = eventsRepo.getById(record.eventId);
      if (eventObj && eventObj.eventName) {
        context.eventName = eventObj.eventName;
      }
    } catch (e) {}
  }

  if (record.teamId) {
    try {
      var teamsRepo = new SheetRepository("02_Teams", "TEAM", "teamId");
      var teamObj = teamsRepo.getById(record.teamId);
      if (teamObj && teamObj.teamName) {
        context.teamName = teamObj.teamName;
      }
    } catch (e) {}
  }

  if (record.assignedBy) {
    var assigner = resolveNotificationRecipient(record.assignedBy);
    if (assigner && assigner.name) {
      context.assignedByName = assigner.name;
    }
  }

  if (record.assignedTo) {
    var owner = resolveNotificationRecipient(record.assignedTo);
    if (owner && owner.name) {
      context.ownerName = owner.name;
    }
  }

  if (extraData.verifierName) {
    context.verifierName = extraData.verifierName;
  } else if (record.verifierId) {
    var verifier = resolveNotificationRecipient(record.verifierId);
    if (verifier && verifier.name) context.verifierName = verifier.name;
  } else if (record.assignedBy) {
    context.verifierName = context.assignedByName;
  }

  return context;
}

/**
 * Builds clean, responsive Apple-inspired email templates with Capacitor App launch buttons.
 * (No raw links; only deep-linking button actions).
 */
function buildEmailTemplate(eventType, record, recipient, context, extraData) {
  var isMeeting = eventType.indexOf("MEETING_") === 0 || eventType === "MOM_ASSIGNED";
  var itemTitle = record.taskTitle || record.title || record.agenda || "Operations Notice";
  
  // App Action Deep Link
  var targetUrl = "";
  if (isMeeting) {
    var mId = record.meetingId || record.taskId || "";
    targetUrl = context.appUrl + "/meetings" + (mId ? "?meetingId=" + encodeURIComponent(mId) : "");
  } else {
    var tId = record.taskId || "";
    targetUrl = context.appUrl + "/tasks" + (tId ? "?taskId=" + encodeURIComponent(tId) : "");
  }

  var deadlineFormatted = record.deadline ? new Date(record.deadline).toLocaleDateString("en-IN", { dateStyle: "long" }) : "Not Specified";
  var meetingDateFormatted = record.meetingDate ? new Date(record.meetingDate).toLocaleDateString("en-IN", { dateStyle: "full" }) : "Upcoming";
  var priority = record.priority || "MEDIUM";

  var subject = "";
  var heading = "";
  var messageContent = "";
  var buttonText = "Open in NEXUS App";

  switch (eventType) {
    case "TASK_ASSIGNED":
      subject = "New Task Assigned — " + itemTitle;
      heading = "New Task Assignment";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>A new task has been assigned to you in the NEXUS App.</p>" +
        renderMetadataTable([
          { label: "Task", value: itemTitle },
          { label: "Department", value: context.teamName },
          { label: "Assigned by", value: context.assignedByName },
          { label: "Deadline", value: deadlineFormatted },
          { label: "Priority", value: priority }
        ]);
      buttonText = "Open Task in App";
      break;

    case "TASK_REASSIGNED":
      subject = "Task Assigned to You — " + itemTitle;
      heading = "Task Reassigned";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>A task has been reassigned to you in the NEXUS App.</p>" +
        renderMetadataTable([
          { label: "Task", value: itemTitle },
          { label: "Department", value: context.teamName },
          { label: "Assigned by", value: context.assignedByName },
          { label: "Deadline", value: deadlineFormatted },
          { label: "Priority", value: priority }
        ]);
      buttonText = "Open Task in App";
      break;

    case "TASK_READY_FOR_VERIFICATION":
      subject = "Task Ready for Verification — " + itemTitle;
      heading = "Task Submitted for Verification";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p><strong>" + context.ownerName + "</strong> has submitted their task progress for your review.</p>" +
        renderMetadataTable([
          { label: "Task", value: itemTitle },
          { label: "Department", value: context.teamName },
          { label: "Submitted by", value: context.ownerName },
          { label: "Deadline", value: deadlineFormatted }
        ]) +
        (extraData.remarks ? "<div style='margin-top:12px;padding:12px;background:#f5f5f7;border-left:3px solid #0066cc;border-radius:4px;'><strong>Operator Note:</strong> " + extraData.remarks + "</div>" : "");
      buttonText = "Review & Verify in App";
      break;

    case "TASK_VERIFIED":
      subject = "Task Verified & Approved — " + itemTitle;
      heading = "Task Verified & Approved";
      messageContent = 
        "<p>Hi <strong>" + context.ownerName + "</strong>,</p>" +
        "<p>Your task has been reviewed and verified by <strong>" + context.verifierName + "</strong>.</p>" +
        renderMetadataTable([
          { label: "Task", value: itemTitle },
          { label: "Verified by", value: context.verifierName }
        ]);
      buttonText = "View Completed Task";
      break;

    case "TASK_REJECTED":
      subject = "Task Needs Changes — " + itemTitle;
      heading = "Changes Requested";
      messageContent = 
        "<p>Hi <strong>" + context.ownerName + "</strong>,</p>" +
        "<p>Your task was reviewed by <strong>" + context.verifierName + "</strong> and requires adjustments before approval.</p>" +
        renderMetadataTable([
          { label: "Task", value: itemTitle },
          { label: "Reviewed by", value: context.verifierName }
        ]) +
        (extraData.rejectionRemark ? "<div style='margin-top:14px;padding:14px;background:#fff5f5;border-left:3px solid #e02424;border-radius:6px;'><strong style='color:#c81e1e;'>Feedback / Required Changes:</strong><p style='margin:6px 0 0 0;color:#333;'>" + extraData.rejectionRemark + "</p></div>" : "");
      buttonText = "Open Task in App to Edit";
      break;

    case "TASK_BLOCKED":
      subject = "Task Blocked Alert — " + itemTitle;
      heading = "Task Blocked Alert";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>A task has encountered an operational blocker.</p>" +
        renderMetadataTable([
          { label: "Task", value: itemTitle },
          { label: "Department", value: context.teamName },
          { label: "Reported by", value: context.assignedByName }
        ]) +
        (extraData.blockReason ? "<div style='margin-top:14px;padding:14px;background:#fff8f1;border-left:3px solid #ff9800;border-radius:6px;'><strong style='color:#d97706;'>Blocker Details:</strong><p style='margin:6px 0 0 0;color:#333;'>" + extraData.blockReason + "</p></div>" : "");
      buttonText = "Inspect Blocked Task";
      break;

    case "MEETING_SCHEDULED":
      subject = "Meeting Invitation: " + itemTitle;
      heading = "Meeting Scheduled";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>You are invited to an official NEXUS Operations Meeting.</p>" +
        renderMetadataTable([
          { label: "Topic", value: itemTitle },
          { label: "Date", value: meetingDateFormatted },
          { label: "Time", value: record.startTime || "TBD" },
          { label: "Type", value: record.meetingType || "GENERAL" },
          { label: "Venue / Link", value: record.location || "Online / NEXUS Room" },
          { label: "MoM Writer", value: record.momAssigneeName || "Assigned Member" }
        ]) +
        (record.agenda ? "<div style='margin-top:14px;padding:12px;background:#f5f5f7;border-left:3px solid #0066cc;border-radius:6px;'><strong>Agenda:</strong><p style='margin:4px 0 0 0;color:#333;'>" + record.agenda + "</p></div>" : "");
      buttonText = "Open Meeting in App";
      break;

    case "MEETING_REMINDER_1H":
      subject = "1-Hour Reminder: " + itemTitle;
      heading = "Meeting Starts in 1 Hour";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>This is a quick reminder that your meeting begins in 1 hour.</p>" +
        renderMetadataTable([
          { label: "Topic", value: itemTitle },
          { label: "Time", value: record.startTime || "In 1 Hour" },
          { label: "Location", value: record.location || "NEXUS Room" }
        ]);
      buttonText = "Join / View Meeting in App";
      break;

    case "MOM_ASSIGNED":
      subject = "Action Required: MoM Recording Assignment — " + itemTitle;
      heading = "Assigned as Meeting MoM Recorder";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>You have been assigned to record the <strong>Minutes of Meeting (MoM)</strong> for the upcoming meeting.</p>" +
        renderMetadataTable([
          { label: "Meeting", value: itemTitle },
          { label: "Date & Time", value: meetingDateFormatted + " @ " + (record.startTime || "") },
          { label: "Location", value: record.location || "NEXUS Room" }
        ]) +
        "<p style='margin-top:14px;color:#333;'>Please create a Google Doc during the meeting, record key discussions and resolutions, and submit the link in the NEXUS App after the meeting concludes.</p>";
      buttonText = "Upload MoM Link in App";
      break;

    default:
      return null;
  }

  // Generate responsive HTML template with prominent App Action button (no raw text links)
  var htmlBody = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head>" +
    "<meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
    "<style>" +
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7; margin: 0; padding: 24px 12px; color: #1d1d1f; -webkit-font-smoothing: antialiased; }" +
    ".card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e5e5ea; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }" +
    ".header { background: #0066cc; padding: 22px 24px; color: #ffffff; }" +
    ".header h2 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }" +
    ".content { padding: 24px; font-size: 14px; line-height: 1.55; color: #1d1d1f; }" +
    ".btn-container { text-align: center; margin: 26px 0 10px 0; }" +
    ".btn { display: inline-block; background-color: #0066cc; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,102,204,0.3); }" +
    ".footer { padding: 16px 24px; background: #fafafc; border-top: 1px solid #f0f0f2; text-align: center; font-size: 11.5px; color: #86868b; }" +
    "table { width: 100%; border-collapse: collapse; margin-top: 14px; }" +
    "td { padding: 6px 0; font-size: 13.5px; vertical-align: top; }" +
    "td.lbl { width: 120px; color: #86868b; font-weight: 500; }" +
    "td.val { color: #1d1d1f; font-weight: 600; }" +
    "</style>" +
    "</head>" +
    "<body>" +
    "<div class='card'>" +
    "<div class='header'>" +
    "<h2>" + heading + "</h2>" +
    "</div>" +
    "<div class='content'>" +
    messageContent +
    "<div class='btn-container'>" +
    "<a href='" + targetUrl + "' class='btn' target='_blank'>" + buttonText + "</a>" +
    "</div>" +
    "</div>" +
    "<div class='footer'>" +
    "NEXUS CRM & Operations System • Tap button above to open inside NEXUS App" +
    "</div>" +
    "</div>" +
    "</body>" +
    "</html>";

  // Plain text fallback
  var plainBody = 
    heading + "\n\n" +
    "Topic / Task: " + itemTitle + "\n" +
    "Details: Tap the notification in NEXUS App.\n\n" +
    "— NEXUS Operations Core";

  return {
    subject: subject,
    htmlBody: htmlBody,
    plainBody: plainBody
  };
}

function renderMetadataTable(rows) {
  var html = "<table style='width:100%;margin:12px 0;'>";
  for (var i = 0; i < rows.length; i++) {
    html += "<tr><td class='lbl' style='color:#777;width:120px;padding:4px 0;'>" + rows[i].label + ":</td><td class='val' style='color:#111;font-weight:600;padding:4px 0;'>" + rows[i].value + "</td></tr>";
  }
  html += "</table>";
  return html;
}

/**
 * Duplicate Protection Cache
 */
var _notificationCache = {};
function isDuplicateNotification(id, eventType, recipientUserId) {
  var key = id + "|" + eventType + "|" + recipientUserId;
  var now = new Date().getTime();
  if (_notificationCache[key] && (now - _notificationCache[key]) < 60000) {
    return true;
  }
  _notificationCache[key] = now;
  return false;
}

function ensureNotificationsSheetExists() {
  try {
    var ss = typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName("22_Notifications");
    if (!sheet) {
      sheet = ss.insertSheet("22_Notifications");
      var headers = ["notificationId", "eventType", "taskId", "eventId", "recipientUserId", "recipientEmail", "subject", "status", "sentAt", "errorMessage", "createdAt"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1d1d1f").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
  } catch (e) {
    Logger.log("ensureNotificationsSheetExists error: " + e.toString());
  }
}

/**
 * Writes an entry to the 22_Notifications sheet for administrative inspection & debugging.
 */
function logNotificationEntry(entry) {
  try {
    ensureNotificationsSheetExists();
    var notifRepo = new SheetRepository("22_Notifications", "NTF", "notificationId");
    notifRepo.insert({
      eventType: entry.eventType || "",
      taskId: entry.taskId || "",
      eventId: entry.eventId || "",
      recipientUserId: entry.recipientUserId || "",
      recipientEmail: entry.recipientEmail || "",
      subject: entry.subject || "",
      status: entry.status || "PENDING",
      sentAt: entry.sentAt || (entry.status === "SENT" ? new Date() : ""),
      errorMessage: entry.errorMessage || ""
    });
  } catch (err) {
    Logger.log("Failed to write to 22_Notifications sheet: " + err.toString());
  }
}
