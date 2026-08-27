// Dashboard.gs — Aggregates analytics metrics and manages background triggers.

/**
 * Compiles the Executive Dashboard metrics. Restricted to PRESIDENT/VP.
 * @returns {Object} Executive metrics
 */
function handleGetExecutiveDashboard() {
  var eventsRepo = new SheetRepository("03_Events", "EVT", "eventId");
  var tasksRepo = new SheetRepository("04_Tasks", "TSK", "taskId");
  var budgetRepo = new SheetRepository("14_Budget", "BDG", "budgetId");
  var auditRepo = new SheetRepository("19_Audit_Log", "AUD", "auditId");

  // 1. Active Events Count (status is not CANCELLED)
  var activeEvents = eventsRepo.getAll().length;

  // 2. Task metrics
  var allTasks = handleListTasks();
  var totalTasksCount = allTasks.length;
  
  var completedTasksCount = 0;
  var overdueTasksCount = 0;
  var todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  for (var i = 0; i < allTasks.length; i++) {
    var status = String(allTasks[i].status || '').toUpperCase();
    if (status === "COMPLETED") {
      completedTasksCount++;
    } else if (status !== "CANCELLED") {
      // Check overdue
      if (allTasks[i].deadline) {
        var deadlineDate = new Date(allTasks[i].deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate < todayStart) {
          overdueTasksCount++;
        }
      }
    }
  }

  var completionPercent = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  // 3. Finance Summary
  var allBudgets = budgetRepo.getAll();
  var totalEstimatedBudget = 0;
  var totalActualExpense = 0;
  for (var j = 0; j < allBudgets.length; j++) {
    var approvalStatus = String(allBudgets[j].approvalStatus || '').toUpperCase();
    if (approvalStatus === "APPROVED") {
      totalEstimatedBudget += Number(allBudgets[j].estimatedBudget) || 0;
      totalActualExpense += Number(allBudgets[j].actualExpense) || 0;
    }
  }

  // 4. Recent Audit Logs
  // Get raw audit logs (so we get recently deleted/cancelled ones too if logged)
  var rawAuditLogs = auditRepo._getData().rows || [];
  // Sort descending by timestamp
  rawAuditLogs.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  var recentLogs = rawAuditLogs.slice(0, 5);

  return {
    activeEvents: activeEvents,
    totalTasks: totalTasksCount,
    completedTasks: completedTasksCount,
    completionPercent: Math.round(completionPercent) || 0,
    overdueTasks: overdueTasksCount,
    totalEstimatedBudget: totalEstimatedBudget,
    totalActualExpense: totalActualExpense,
    recentLogs: recentLogs
  };
}

/**
 * Compiles the Team Dashboard metrics for a specific team. Restricted to LEAD and above.
 * @param {string} teamId - Unique ID of the team
 * @returns {Object} Team metrics
 */
function handleGetTeamDashboard(teamId) {
  if (!teamId) {
    throw new Error("Missing team ID.");
  }

  var teamsRepo = new SheetRepository("02_Teams", "TEAM", "teamId");
  var teamDetails = teamsRepo.getById(teamId);
  if (!teamDetails) {
    throw new Error("Team not found with ID: " + teamId);
  }

  var usersRepo = new SheetRepository("01_Users", "USR", "userId");

  // 1. Team Tasks metrics (from active non-cancelled list)
  var allActiveTasks = handleListTasks();
  var teamTasks = allActiveTasks.filter(function(t) {
    return String(t.teamId || '').trim().toUpperCase() === String(teamId).trim().toUpperCase();
  });
  var totalTasksCount = teamTasks.length;
  
  var completedTasksCount = 0;
  var overdueTasksCount = 0;
  var todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  for (var i = 0; i < teamTasks.length; i++) {
    var status = String(teamTasks[i].status || '').toUpperCase();
    if (status === "COMPLETED") {
      completedTasksCount++;
    } else if (status !== "CANCELLED") {
      // Check overdue
      if (teamTasks[i].deadline) {
        var deadlineDate = new Date(teamTasks[i].deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate < todayStart) {
          overdueTasksCount++;
        }
      }
    }
  }

  var completionPercent = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  // 2. Active Team Members Count
  var teamMembers = usersRepo.find({ teamId: teamId });
  var activeMembersCount = teamMembers.length;

  // 3. Team Workload Breakdown
  var normalCount = 0;
  var highCount = 0;
  var overloadedCount = 0;

  for (var j = 0; j < teamMembers.length; j++) {
    var memberWorkload = handleGetUserWorkload(teamMembers[j].userId);
    if (memberWorkload.workloadState === "NORMAL") normalCount++;
    if (memberWorkload.workloadState === "HIGH") highCount++;
    if (memberWorkload.workloadState === "OVERLOADED") overloadedCount++;
  }

  return {
    teamId: teamId,
    teamName: teamDetails.teamName,
    activeTasks: totalTasksCount,
    completedTasks: completedTasksCount,
    completionPercent: Math.round(completionPercent) || 0,
    overdueTasks: overdueTasksCount,
    activeMembers: activeMembersCount,
    workloadBreakdown: {
      NORMAL: normalCount,
      HIGH: highCount,
      OVERLOADED: overloadedCount
    }
  };
}

/**
 * Compiles the Member Dashboard metrics for a specific member.
 * @param {string} userId - Unique ID of the member
 * @returns {Object} Member metrics
 */
function handleGetMemberDashboard(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  var allActiveTasks = handleListTasks();
  var memberTasks = allActiveTasks.filter(function(t) {
    return String(t.assignedTo || '').trim().toUpperCase() === String(userId).trim().toUpperCase();
  });
  var totalTasksCount = memberTasks.length;

  var completedTasksCount = 0;
  var overdueTasksCount = 0;
  var todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  var statusBreakdown = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    DELAYED: 0,
    BLOCKED: 0
  };

  for (var i = 0; i < memberTasks.length; i++) {
    var status = String(memberTasks[i].status || '').toUpperCase();
    if (status === "COMPLETED") {
      completedTasksCount++;
    } else if (status !== "CANCELLED") {
      if (statusBreakdown.hasOwnProperty(status)) {
        statusBreakdown[status]++;
      }
      // Check overdue
      if (memberTasks[i].deadline) {
        var deadlineDate = new Date(memberTasks[i].deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate < todayStart) {
          overdueTasksCount++;
        }
      }
    }
  }

  var completionPercent = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  return {
    userId: userId,
    assignedTasks: totalTasksCount,
    completedTasks: completedTasksCount,
    completionPercent: Math.round(completionPercent) || 0,
    overdueTasks: overdueTasksCount,
    statusBreakdown: statusBreakdown
  };
}

/**
 * Daily morning job: updates overdue task statuses, checks birthdays, and caches executive metrics.
 */
function runMorningJob() {
  Logger.log("=== RUNNING DAILY MORNING TRIGGERS ===");
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Process Overdue Tasks -> flag DELAYED
  var tasksRepo = new SheetRepository("04_Tasks", "TSK", "taskId");
  // Bypass active filter by loading raw rows
  var rawTasks = tasksRepo._getData().rows;
  var todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  var delayedCount = 0;
  for (var i = 0; i < rawTasks.length; i++) {
    var task = rawTasks[i];
    var status = String(task.status || '').toUpperCase();
    if (status !== "COMPLETED" && status !== "CANCELLED") {
      if (task.deadline) {
        var deadlineDate = new Date(task.deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate < todayStart) {
          if (status !== "DELAYED") {
            handleUpdateTaskStatus(task.taskId, "DELAYED", "Flagged DELAYED automatically by daily check.", "SYSTEM");
            delayedCount++;
          }
        }
      }
    }
  }
  Logger.log("Flagged " + delayedCount + " overdue tasks as DELAYED.");

  // 2. Check Upcoming Birthdays (within next 7 days)
  var birthdaysSheet = ss.getSheetByName("09_Birthdays");
  if (birthdaysSheet) {
    var birthdaysRepo = new SheetRepository("09_Birthdays", null, "birthdayId");
    var allBirthdays = birthdaysRepo.getAll();
    var today = new Date();
    
    var upcomingBirthdaysCount = 0;
    Logger.log("Checking birthdays in the next 7 days...");
    
    for (var j = 0; j < allBirthdays.length; j++) {
      var bday = allBirthdays[j];
      if (bday.birthday) {
        var bdayDate = new Date(bday.birthday);
        if (!isNaN(bdayDate.getTime())) {
          // Compare day and month relative to current year
          var targetDate = new Date(today.getFullYear(), bdayDate.getMonth(), bdayDate.getDate());
          var diffTime = targetDate.getTime() - today.getTime();
          var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays <= 7) {
            Logger.log("🎉 Upcoming Birthday: " + bday.facultyName + " (" + bday.department + ") on " + bdayDate.getDate() + "/" + (bdayDate.getMonth() + 1));
            upcomingBirthdaysCount++;
          }
        }
      }
    }
    Logger.log("Found " + upcomingBirthdaysCount + " upcoming birthdays.");
  }

  // 3. Cache Executive Dashboard Metrics to 21_Dashboard_Data
  var dashboardData = handleGetExecutiveDashboard();
  var metricRepo = new SheetRepository("21_Dashboard_Data", null, "metricKey");
  
  // Clear the metric sheet first (to keep it fresh and clean)
  var metricSheet = ss.getSheetByName("21_Dashboard_Data");
  if (metricSheet && metricSheet.getLastRow() > 1) {
    metricSheet.deleteRows(2, metricSheet.getLastRow() - 1);
  }
  metricRepo._clearCache();
  
  var calcDate = new Date();
  metricRepo.insert({ metricKey: "activeEvents", metricValue: String(dashboardData.activeEvents), calculatedAt: calcDate });
  metricRepo.insert({ metricKey: "totalTasks", metricValue: String(dashboardData.totalTasks), calculatedAt: calcDate });
  metricRepo.insert({ metricKey: "completedTasks", metricValue: String(dashboardData.completedTasks), calculatedAt: calcDate });
  metricRepo.insert({ metricKey: "completionPercent", metricValue: String(dashboardData.completionPercent), calculatedAt: calcDate });
  metricRepo.insert({ metricKey: "overdueTasks", metricValue: String(dashboardData.overdueTasks), calculatedAt: calcDate });
  metricRepo.insert({ metricKey: "totalEstimatedBudget", metricValue: String(dashboardData.totalEstimatedBudget), calculatedAt: calcDate });
  metricRepo.insert({ metricKey: "totalActualExpense", metricValue: String(dashboardData.totalActualExpense), calculatedAt: calcDate });
  
  Logger.log("Dashboard analytics cached in 21_Dashboard_Data.");
  Logger.log("=== DAILY MORNING TRIGGERS COMPLETE ===");
}

/**
 * Configures the daily morning time-driven trigger for runMorningJob. Deduplicates active triggers.
 */
function setupMorningTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = false;
  
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runMorningJob") {
      exists = true;
      break;
    }
  }
  
  if (!exists) {
    ScriptApp.newTrigger("runMorningJob")
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();
    Logger.log("Configured time-driven daily trigger for runMorningJob at 6 AM.");
  } else {
    Logger.log("Daily trigger for runMorningJob already exists. Skipping configuration.");
  }
}
