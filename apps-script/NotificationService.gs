// NotificationService.gs — Centralized transactional email & notification engine for NEXUS CRM.
// Responsible for event detection, recipient resolution, templating, and failure-isolated dispatch.

/**
 * Dispatches an automated email notification based on task lifecycle events.
 * Safe side-effect: will never throw or interrupt the caller's main transaction.
 * 
 * @param {string} eventType - One of: TASK_ASSIGNED, TASK_REASSIGNED, TASK_READY_FOR_VERIFICATION, TASK_VERIFIED, TASK_REJECTED, TASK_BLOCKED
 * @param {Object} taskRecord - The updated/created task entity
 * @param {string} recipientUserIdOrUid - The user ID or UID of the target recipient
 * @param {Object} [extraData] - Optional context: { rejectionRemark, blockReason, remarks, operatorName, ... }
 */
function sendNotification(eventType, taskRecord, recipientUserIdOrUid, extraData) {
  if (!taskRecord || !eventType) return;
  extraData = extraData || {};

  try {
    // 1. Resolve recipient user
    var recipient = resolveNotificationRecipient(recipientUserIdOrUid);
    if (!recipient || !recipient.email) {
      logNotificationEntry({
        eventType: eventType,
        taskId: taskRecord.taskId || "",
        eventId: taskRecord.eventId || "",
        recipientUserId: recipientUserIdOrUid || "UNKNOWN",
        recipientEmail: recipient ? recipient.email : "MISSING",
        subject: "N/A",
        status: "SKIPPED",
        errorMessage: "Recipient user not found or missing valid email address."
      });
      return;
    }

    // 2. Resolve additional metadata (Event name, Team name, Assigner/Verifier name)
    var contextData = resolveNotificationContext(taskRecord, extraData);

    // 3. Build Email Template (Subject, HTML, Plaintext)
    var template = buildEmailTemplate(eventType, taskRecord, recipient, contextData, extraData);
    if (!template) {
      logNotificationEntry({
        eventType: eventType,
        taskId: taskRecord.taskId || "",
        eventId: taskRecord.eventId || "",
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        subject: "N/A",
        status: "SKIPPED",
        errorMessage: "No template mapped for eventType: " + eventType
      });
      return;
    }

    // 4. Duplicate Protection: Check if identical notification was sent in the last 60 seconds
    if (isDuplicateNotification(taskRecord.taskId, eventType, recipient.userId)) {
      Logger.log("Duplicate notification suppressed: " + eventType + " for task " + taskRecord.taskId);
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
      taskId: taskRecord.taskId || "",
      eventId: taskRecord.eventId || "",
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
      taskId: taskRecord.taskId || "",
      eventId: taskRecord.eventId || "",
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
  
  // Try by userId first (e.g. USR-00001)
  if (userIdOrUid.indexOf("USR-") === 0) {
    var user = usersRepo.getById(userIdOrUid);
    if (user && user.email) return user;
  }
  
  // Try by firebaseUid
  var matches = usersRepo.find({ firebaseUid: userIdOrUid });
  if (matches.length > 0 && matches[0].email) {
    return matches[0];
  }
  
  // Try by direct email match if passed as email
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
function resolveNotificationContext(taskRecord, extraData) {
  var context = {
    eventName: "General Operations",
    teamName: "Core Team",
    assignedByName: "NEXUS Administrator",
    verifierName: "Operations Lead",
    ownerName: "Task Assignee",
    appUrl: "http://localhost:5173" // Default fallback URL
  };

  // Resolve Portal URL from Settings if configured
  try {
    var settingsRepo = new SheetRepository("00_Settings", null, "settingKey");
    var appUrlSetting = settingsRepo.getById("PORTAL_BASE_URL");
    if (appUrlSetting && appUrlSetting.settingValue) {
      context.appUrl = appUrlSetting.settingValue.replace(/\/$/, "");
    }
  } catch (e) {}

  // Resolve Event Name
  if (taskRecord.eventId) {
    try {
      var eventsRepo = new SheetRepository("03_Events", "EVT", "eventId");
      var eventObj = eventsRepo.getById(taskRecord.eventId);
      if (eventObj && eventObj.eventName) {
        context.eventName = eventObj.eventName;
      }
    } catch (e) {}
  }

  // Resolve Team Name
  if (taskRecord.teamId) {
    try {
      var teamsRepo = new SheetRepository("02_Teams", "TEAM", "teamId");
      var teamObj = teamsRepo.getById(taskRecord.teamId);
      if (teamObj && teamObj.teamName) {
        context.teamName = teamObj.teamName;
      }
    } catch (e) {}
  }

  // Resolve Assigner Name
  if (taskRecord.assignedBy) {
    var assigner = resolveNotificationRecipient(taskRecord.assignedBy);
    if (assigner && assigner.name) {
      context.assignedByName = assigner.name;
    }
  }

  // Resolve Owner Name
  if (taskRecord.assignedTo) {
    var owner = resolveNotificationRecipient(taskRecord.assignedTo);
    if (owner && owner.name) {
      context.ownerName = owner.name;
    }
  }

  // Resolve Verifier Name (from extraData or task.verifierId / assignedBy)
  if (extraData.verifierName) {
    context.verifierName = extraData.verifierName;
  } else if (taskRecord.verifierId) {
    var verifier = resolveNotificationRecipient(taskRecord.verifierId);
    if (verifier && verifier.name) context.verifierName = verifier.name;
  } else if (taskRecord.assignedBy) {
    context.verifierName = context.assignedByName;
  }

  return context;
}

/**
 * Builds email templates matching PRD §10 requirements with responsive Apple aesthetic.
 */
function buildEmailTemplate(eventType, task, recipient, context, extraData) {
  var taskTitle = task.taskTitle || "Untitled Task";
  var taskUrl = context.appUrl + "/tasks?taskId=" + encodeURIComponent(task.taskId);
  var deadlineFormatted = task.deadline ? new Date(task.deadline).toLocaleDateString("en-IN", { dateStyle: "long" }) : "Not Specified";
  var priority = task.priority || "MEDIUM";

  var subject = "";
  var heading = "";
  var messageContent = "";
  var buttonText = "Open Task in NEXUS";

  switch (eventType) {
    case "TASK_ASSIGNED":
      subject = "New Task Assigned — " + taskTitle;
      heading = "New Task Assigned";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>A new task has been assigned to you in NEXUS.</p>" +
        renderMetadataTable([
          { label: "Task", value: taskTitle },
          { label: "Event", value: context.eventName },
          { label: "Team", value: context.teamName },
          { label: "Assigned by", value: context.assignedByName },
          { label: "Deadline", value: deadlineFormatted },
          { label: "Priority", value: priority }
        ]);
      break;

    case "TASK_REASSIGNED":
      subject = "Task Assigned to You — " + taskTitle;
      heading = "Task Reassigned";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>A task has been reassigned to you in NEXUS.</p>" +
        renderMetadataTable([
          { label: "Task", value: taskTitle },
          { label: "Event", value: context.eventName },
          { label: "Team", value: context.teamName },
          { label: "Assigned by", value: context.assignedByName },
          { label: "Deadline", value: deadlineFormatted },
          { label: "Priority", value: priority }
        ]);
      break;

    case "TASK_READY_FOR_VERIFICATION":
      subject = "Task Ready for Verification — " + taskTitle;
      heading = "Task Submitted for Verification";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p><strong>" + context.ownerName + "</strong> has submitted a task for your verification.</p>" +
        renderMetadataTable([
          { label: "Task", value: taskTitle },
          { label: "Event", value: context.eventName },
          { label: "Team", value: context.teamName },
          { label: "Submitted by", value: context.ownerName },
          { label: "Deadline", value: deadlineFormatted }
        ]) +
        (extraData.remarks ? "<div style='margin-top:12px;padding:12px;background:#f5f5f7;border-left:3px solid #0066cc;border-radius:4px;'><strong>Operator Note:</strong> " + extraData.remarks + "</div>" : "");
      buttonText = "Review Task & Verify";
      break;

    case "TASK_VERIFIED":
      subject = "Task Verified — " + taskTitle;
      heading = "Task Verified & Approved";
      messageContent = 
        "<p>Hi <strong>" + context.ownerName + "</strong>,</p>" +
        "<p>Your task has been reviewed and verified by <strong>" + context.verifierName + "</strong>. The task is now marked as completed.</p>" +
        renderMetadataTable([
          { label: "Task", value: taskTitle },
          { label: "Event", value: context.eventName },
          { label: "Verified by", value: context.verifierName }
        ]);
      break;

    case "TASK_REJECTED":
      subject = "Task Needs Changes — " + taskTitle;
      heading = "Changes Requested";
      messageContent = 
        "<p>Hi <strong>" + context.ownerName + "</strong>,</p>" +
        "<p>Your task was reviewed by <strong>" + context.verifierName + "</strong> and requires changes before it can be verified.</p>" +
        renderMetadataTable([
          { label: "Task", value: taskTitle },
          { label: "Event", value: context.eventName },
          { label: "Reviewed by", value: context.verifierName }
        ]) +
        (extraData.rejectionRemark ? "<div style='margin-top:14px;padding:14px;background:#fff5f5;border-left:3px solid #e02424;border-radius:6px;'><strong style='color:#c81e1e;'>Feedback / Reason for Changes:</strong><p style='margin:6px 0 0 0;color:#333;'>" + extraData.rejectionRemark + "</p></div>" : "") +
        "<p style='margin-top:14px;color:#555;'>Please open NEXUS, review the feedback, update your work, and submit the task again for verification.</p>";
      buttonText = "Open Task to Make Changes";
      break;

    case "TASK_BLOCKED":
      subject = "Task Blocked — " + taskTitle;
      heading = "Task Blocked Notice";
      messageContent = 
        "<p>Hi <strong>" + recipient.name + "</strong>,</p>" +
        "<p>A task has been marked as <strong>BLOCKED</strong> in NEXUS.</p>" +
        renderMetadataTable([
          { label: "Task", value: taskTitle },
          { label: "Event", value: context.eventName },
          { label: "Owner", value: context.ownerName },
          { label: "Blocked by", value: context.assignedByName }
        ]) +
        (extraData.blockReason ? "<div style='margin-top:14px;padding:14px;background:#fff8f1;border-left:3px solid #ff9800;border-radius:6px;'><strong style='color:#d97706;'>Blocker Details:</strong><p style='margin:6px 0 0 0;color:#333;'>" + extraData.blockReason + "</p></div>" : "");
      buttonText = "Inspect Blocked Task";
      break;

    default:
      return null;
  }

  // Generate responsive HTML template
  var htmlBody = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head>" +
    "<meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
    "<style>" +
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7; margin: 0; padding: 24px; color: #1d1d1f; }" +
    ".card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5ea; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }" +
    ".header { background: #0066cc; padding: 20px 24px; color: #ffffff; }" +
    ".header h2 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }" +
    ".content { padding: 24px; font-size: 14px; line-height: 1.5; color: #1d1d1f; }" +
    ".btn { display: inline-block; background-color: #0066cc; color: #ffffff !important; padding: 10px 22px; text-decoration: none; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-top: 18px; text-align: center; }" +
    ".footer { padding: 16px 24px; background: #fafafc; border-top: 1px solid #f0f0f2; text-align: center; font-size: 11px; color: #86868b; }" +
    "table { width: 100%; border-collapse: collapse; margin-top: 12px; }" +
    "td { padding: 6px 0; font-size: 13px; vertical-align: top; }" +
    "td.lbl { width: 110px; color: #86868b; font-weight: 500; }" +
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
    "<div style='text-align: center; margin-top: 20px;'>" +
    "<a href='" + taskUrl + "' class='btn' target='_blank'>" + buttonText + "</a>" +
    "</div>" +
    "</div>" +
    "<div class='footer'>" +
    "NEXUS CRM & Operations System • Direct Link: <a href='" + taskUrl + "' style='color:#0066cc;text-decoration:none;'>" + task.taskId + "</a>" +
    "</div>" +
    "</div>" +
    "</body>" +
    "</html>";

  // Plain text fallback
  var plainBody = 
    heading + "\n\n" +
    "Task: " + taskTitle + "\n" +
    "Event: " + context.eventName + "\n" +
    "Team: " + context.teamName + "\n" +
    "Deadline: " + deadlineFormatted + "\n" +
    "Priority: " + priority + "\n\n" +
    "Open task in NEXUS:\n" + taskUrl + "\n\n" +
    "— NEXUS Core Operations";

  return {
    subject: subject,
    htmlBody: htmlBody,
    plainBody: plainBody
  };
}

function renderMetadataTable(rows) {
  var html = "<table style='width:100%;margin:12px 0;'>";
  for (var i = 0; i < rows.length; i++) {
    html += "<tr><td class='lbl' style='color:#777;width:110px;padding:4px 0;'>" + rows[i].label + ":</td><td class='val' style='color:#111;font-weight:600;padding:4px 0;'>" + rows[i].value + "</td></tr>";
  }
  html += "</table>";
  return html;
}

/**
 * Checks for recent identical notification to prevent double-firing on network retries.
 */
var _notificationCache = {};
function isDuplicateNotification(taskId, eventType, recipientUserId) {
  var key = taskId + "|" + eventType + "|" + recipientUserId;
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

/**
 * Test utility function that can be executed directly inside Apps Script editor to send a sample test email.
 */
function testSendNotificationEmail() {
  var sampleTask = {
    taskId: "TSK-TEST-001",
    taskTitle: "Design IEEE Symposium Keynote Poster",
    taskDescription: "Create a high-resolution banner and social promo assets for keynote speaker.",
    priority: "HIGH",
    deadline: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000),
    teamId: "TEAM-001",
    assignedTo: "vinit.ghaturle.ds@ghrce.raisoni.net"
  };

  sendNotification("TASK_ASSIGNED", sampleTask, "vinit.ghaturle.ds@ghrce.raisoni.net", {
    remarks: "This is a direct test of the NEXUS CRM transactional email service."
  });
  
  Logger.log("Test execution completed for: vinit.ghaturle.ds@ghrce.raisoni.net");
}
