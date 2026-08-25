// PerformanceHandler.gs — Core handlers for performance evaluations (18_Performance sheet).

function enforceExecutiveAccess(user) {
  if (!user) {
    throw new Error("FORBIDDEN: Authentication required.");
  }
  var role = user.role ? user.role.toUpperCase() : "";
  if (role !== "PRESIDENT" && role !== "VP") {
    throw new Error("FORBIDDEN: You do not have permission to access performance evaluations.");
  }
}

function handleListPerformance(user) {
  enforceExecutiveAccess(user);
  var repo = new SheetRepository("18_Performance", "PRF", "performanceId");
  var list = repo.getAll();
  logAudit(user.userId, "PERFORMANCE_VIEW", "Performance", "ALL", "", "", "SUCCESS");
  return list;
}

function handleGetPerformance(performanceId, user) {
  enforceExecutiveAccess(user);
  if (!performanceId) {
    throw new Error("Missing performance ID.");
  }
  var repo = new SheetRepository("18_Performance", "PRF", "performanceId");
  var record = repo.getById(performanceId);
  if (!record) {
    throw new Error("Performance record not found with ID: " + performanceId);
  }
  logAudit(user.userId, "PERFORMANCE_VIEW", "Performance", performanceId, "", "", "SUCCESS");
  return record;
}

function handleUpdatePerformance(performanceId, data, user) {
  enforceExecutiveAccess(user);
  if (!data || !data.userId || !data.period) {
    throw new Error("Invalid payload: userId and period are required.");
  }

  var repo = new SheetRepository("18_Performance", "PRF", "performanceId");
  var settings = handleGetSettings(); // Get settings for weights

  var taskCompletion = Number(data.taskCompletionScore) || 0;
  var onTime = Number(data.onTimeScore) || 0;
  var eventParticipation = Number(data.eventParticipationScore) || 0;
  var meetingAttendance = Number(data.meetingAttendanceScore) || 0;
  var initiative = Number(data.initiativeScore) || 0;
  var teamCoordination = Number(data.teamCoordinationScore) || 0;
  var responsibility = Number(data.responsibilityScore) || 0;
  var communication = Number(data.communicationScore) || 0;
  var quality = Number(data.qualityScore) || 0;
  var consistency = Number(data.consistencyScore) || 0;

  var overall = calculateOverallScore({
    taskCompletionScore: taskCompletion,
    onTimeScore: onTime,
    eventParticipationScore: eventParticipation,
    meetingAttendanceScore: meetingAttendance,
    initiativeScore: initiative,
    teamCoordinationScore: teamCoordination,
    responsibilityScore: responsibility,
    communicationScore: communication,
    qualityScore: quality,
    consistencyScore: consistency
  }, settings);

  var payload = {
    userId: data.userId,
    period: data.period,
    taskCompletionScore: taskCompletion,
    onTimeScore: onTime,
    eventParticipationScore: eventParticipation,
    meetingAttendanceScore: meetingAttendance,
    initiativeScore: initiative,
    teamCoordinationScore: teamCoordination,
    responsibilityScore: responsibility,
    communicationScore: communication,
    qualityScore: quality,
    consistencyScore: consistency,
    overallScore: overall,
    remarks: data.remarks || "",
    evaluatedBy: user.userId,
    evaluatedAt: new Date()
  };

  var record;
  var previousValue = "";
  var actionType = "INSERT";

  // Check if upserting by userId and period (if no performanceId is supplied)
  if (!performanceId) {
    var existingList = repo.find({ userId: data.userId, period: data.period });
    if (existingList && existingList.length > 0) {
      performanceId = existingList[0].performanceId;
    }
  }

  if (performanceId) {
    var existing = repo.getById(performanceId);
    if (!existing) {
      throw new Error("Performance record not found to update with ID: " + performanceId);
    }
    previousValue = JSON.stringify(existing);
    record = repo.update(performanceId, payload);
    actionType = "UPDATE";
  } else {
    record = repo.insert(payload);
  }

  logAudit(user.userId, "PERFORMANCE_UPDATE", "Performance", record.performanceId, previousValue, JSON.stringify(record), "SUCCESS");
  return record;
}

function calculateOverallScore(data, settings) {
  var w_task = Number(settings["PERFORMANCE_WEIGHT_TASK_COMPLETION"]) || 0.15;
  var w_ontime = Number(settings["PERFORMANCE_WEIGHT_ON_TIME"]) || 0.15;
  var w_event = Number(settings["PERFORMANCE_WEIGHT_EVENT_PARTICIPATION"]) || 0.10;
  var w_meeting = Number(settings["PERFORMANCE_WEIGHT_MEETING_ATTENDANCE"]) || 0.10;
  var w_initiative = Number(settings["PERFORMANCE_WEIGHT_INITIATIVE"]) || 0.10;
  var w_coordination = Number(settings["PERFORMANCE_WEIGHT_TEAM_COORDINATION"]) || 0.10;
  var w_responsibility = Number(settings["PERFORMANCE_WEIGHT_RESPONSIBILITY"]) || 0.10;
  var w_communication = Number(settings["PERFORMANCE_WEIGHT_COMMUNICATION"]) || 0.10;
  var w_quality = Number(settings["PERFORMANCE_WEIGHT_QUALITY"]) || 0.05;
  var w_consistency = Number(settings["PERFORMANCE_WEIGHT_CONSISTENCY"]) || 0.05;

  var score = 
    data.taskCompletionScore * w_task +
    data.onTimeScore * w_ontime +
    data.eventParticipationScore * w_event +
    data.meetingAttendanceScore * w_meeting +
    data.initiativeScore * w_initiative +
    data.teamCoordinationScore * w_coordination +
    data.responsibilityScore * w_responsibility +
    data.communicationScore * w_communication +
    data.qualityScore * w_quality +
    data.consistencyScore * w_consistency;

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}
