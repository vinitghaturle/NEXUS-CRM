// ReportsHandler.gs — Core handlers for automated reporting snapshots (17_Reports sheet).

function handleListReports() {
  var repo = new SheetRepository("17_Reports", "RPT", "reportId");
  return repo.getAll();
}

function handleGenerateReport(payload, operatorUserId) {
  if (!payload || !payload.reportType || !payload.periodStart || !payload.periodEnd) {
    throw new Error("Invalid payload: reportType, periodStart, and periodEnd are required.");
  }

  var reportType = payload.reportType.toUpperCase();
  var periodStart = new Date(payload.periodStart);
  var periodEnd = new Date(payload.periodEnd);

  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
    throw new Error("Invalid date format for periodStart or periodEnd.");
  }

  // 1. Fetch Events
  var eventsRepo = new SheetRepository("03_Events", "EVT", "eventId");
  var allEvents = eventsRepo.getAll();
  var filteredEvents = allEvents.filter(function(e) {
    var d = new Date(e.eventDate);
    return !isNaN(d.getTime()) && d >= periodStart && d <= periodEnd;
  });
  var completedEventsCount = filteredEvents.filter(function(e) {
    return e.eventStatus === "COMPLETED";
  }).length;

  // 2. Fetch Tasks
  var tasksRepo = new SheetRepository("04_Tasks", "TSK", "taskId");
  var allTasks = tasksRepo.getAll();
  var filteredTasks = allTasks.filter(function(t) {
    if (!t.deadline) return false;
    var d = new Date(t.deadline);
    return !isNaN(d.getTime()) && d >= periodStart && d <= periodEnd;
  });
  var completedTasksCount = filteredTasks.filter(function(t) {
    return t.status === "COMPLETED";
  }).length;
  var overdueTasksCount = filteredTasks.filter(function(t) {
    if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
    var deadlineDate = new Date(t.deadline);
    return !isNaN(deadlineDate.getTime()) && deadlineDate < new Date();
  }).length;

  // 3. Fetch Issues
  var issuesRepo = new SheetRepository("12_Issues", "ISS", "issueId");
  var allIssues = issuesRepo.getAll();
  var filteredIssues = allIssues.filter(function(i) {
    var d = new Date(i.dateRaised || i.createdAt);
    return !isNaN(d.getTime()) && d >= periodStart && d <= periodEnd;
  });
  var resolvedIssuesCount = filteredIssues.filter(function(i) {
    return i.status === "RESOLVED";
  }).length;

  // 4. Fetch Meetings
  var meetingsRepo = new SheetRepository("13_Meetings", "MTG", "meetingId");
  var allMeetings = meetingsRepo.getAll();
  var filteredMeetings = allMeetings.filter(function(m) {
    var d = new Date(m.meetingDate || m.createdAt);
    return !isNaN(d.getTime()) && d >= periodStart && d <= periodEnd;
  });

  // 5. Fetch Budget
  var budgetRepo = new SheetRepository("14_Budget", "BDG", "budgetId");
  var allBudgets = budgetRepo.getAll();
  var filteredBudgets = allBudgets.filter(function(b) {
    var d = new Date(b.createdAt || b.updatedAt);
    return !isNaN(d.getTime()) && d >= periodStart && d <= periodEnd;
  });

  var totalEst = 0;
  var totalAct = 0;
  var totalPaid = 0;
  var totalPending = 0;
  for (var i = 0; i < filteredBudgets.length; i++) {
    var b = filteredBudgets[i];
    totalEst += Number(b.estimatedBudget) || 0;
    totalAct += Number(b.actualExpense) || 0;
    totalPaid += Number(b.amountPaid) || 0;
    totalPending += Number(b.pendingAmount) || 0;
  }

  // Compile Markdown report summary
  var reportMarkdown = 
    "# Operations Report Summary (" + reportType + ")\n" +
    "Period: " + payload.periodStart + " to " + payload.periodEnd + "\n" +
    "Generated At: " + new Date().toLocaleString("en-IN") + "\n\n" +
    "## 1. Events Snapshot\n" +
    "- Total Events: " + filteredEvents.length + "\n" +
    "- Completed: " + completedEventsCount + "\n" +
    "- Active/Planning: " + (filteredEvents.length - completedEventsCount) + "\n\n" +
    "## 2. Task Board Performance\n" +
    "- Total Assigned: " + filteredTasks.length + "\n" +
    "- Completed: " + completedTasksCount + "\n" +
    "- Overdue: " + overdueTasksCount + "\n\n" +
    "## 3. Helpdesk Tickets\n" +
    "- Issues Raised: " + filteredIssues.length + "\n" +
    "- Issues Resolved: " + resolvedIssuesCount + "\n\n" +
    "## 4. Meetings Logged\n" +
    "- Meetings Held: " + filteredMeetings.length + "\n\n" +
    "## 5. Financial Summary\n" +
    "- Total Estimated Budget: INR " + totalEst.toLocaleString("en-IN") + "\n" +
    "- Total Actual Expense: INR " + totalAct.toLocaleString("en-IN") + "\n" +
    "- Total Amount Paid: INR " + totalPaid.toLocaleString("en-IN") + "\n" +
    "- Net Outstanding: INR " + totalPending.toLocaleString("en-IN") + "\n";

  var reportsRepo = new SheetRepository("17_Reports", "RPT", "reportId");
  var newRecord = {
    reportType: reportType,
    periodStart: new Date(payload.periodStart),
    periodEnd: new Date(payload.periodEnd),
    generatedAt: new Date(),
    generatedBy: operatorUserId || "SYSTEM",
    summary: reportMarkdown,
    reportUrl: "#" // Simple hash stub
  };

  var inserted = reportsRepo.insert(newRecord);
  logAudit(operatorUserId, "reports.generate", "Reports", inserted.reportId, "", inserted, "SUCCESS");
  return inserted;
}
