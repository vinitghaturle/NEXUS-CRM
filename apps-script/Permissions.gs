// Permissions.gs — Enforces role-based access control (RBAC).
// Reusable checks to evaluate if a user role can perform a specific operation.

/**
 * Evaluates whether a resolved user can perform a specific action given the resource context.
 * Implements the permissions matrix from PRD §49.
 * @param {Object|string} user - The resolved user object (or user role as string for legacy compatibility)
 * @param {string} action - The action identifier (e.g. "tasks.create")
 * @param {Object} resourceContext - Contextual resource data for checks (e.g. { teamId: "TEAM-001", assignedTo: "USR-00003" })
 * @returns {boolean} True if permitted, false otherwise.
 */
function canUserPerform(user, action, resourceContext) {
  if (!user) return false;
  
  // Extract role, userId, and teamId
  var role, userId, teamId;
  if (typeof user === "string") {
    role = user.toUpperCase();
  } else {
    role = user.role ? user.role.toUpperCase() : "";
    userId = user.userId;
    teamId = user.teamId;
  }

  // Auto-resolve resource attributes if IDs are provided without metadata
  if (resourceContext) {
    if (resourceContext.taskId && (!resourceContext.assignedBy || !resourceContext.assignedTo)) {
      try {
        var tRepo = new SheetRepository("04_Tasks", "TSK", "taskId");
        var tRecord = tRepo.getById(resourceContext.taskId);
        if (tRecord) {
          resourceContext.assignedBy = tRecord.assignedBy;
          resourceContext.assignedTo = tRecord.assignedTo;
          resourceContext.teamId = tRecord.teamId;
        }
      } catch (e) {}
    }
    if (resourceContext.eventId && !resourceContext.createdBy) {
      try {
        var eRepo = new SheetRepository("03_Events", "EVT", "eventId");
        var eRecord = eRepo.getById(resourceContext.eventId);
        if (eRecord) {
          resourceContext.createdBy = eRecord.createdBy;
        }
      } catch (e) {}
    }
  }

  // 1. ADMIN has absolute access to everything — full system permissions.
  if (role === "ADMIN") {
    return true;
  }

  // 2. PRESIDENT and VP have full operational access (core workflow only).
  if (role === "PRESIDENT" || role === "VP") {
    // Advanced module actions and low-level system settings are ADMIN-only
    var adminOnlyActions = [
      "users.create", "users.update", "users.deactivate",
      "teams.create", "teams.update",
      "performance.list", "performance.get", "performance.update",
      "settings.update",
      "audit.list",
      "budget.list", "budget.get", "budget.create", "budget.update",
      "recognition.list", "recognition.create", "recognition.update",
      "reports.list", "reports.generate",
      "creative.list", "creative.create", "creative.update",
      "social.list", "social.create", "social.update",
      "newsletter.list", "newsletter.create", "newsletter.update",
      "birthdays.list", "birthdays.create", "birthdays.update",
      "achievements.list", "achievements.create", "achievements.update",
      "forms.list", "forms.create", "forms.update",
      "issues.list", "issues.create", "issues.update",
      "meetings.list", "meetings.create", "meetings.update",
      "documents.list", "documents.create"
    ];
    if (adminOnlyActions.indexOf(action) !== -1) {
      return false;
    }
    // All other operational actions (events, tasks, teams, users.list, users.get, dashboard): allow
    return true;
  }

  // 3. Context-sensitive actions based on role (LEAD / MEMBER / GENERAL_MEMBER)
  switch (action) {
    case "dashboard.executive":
      return false;

    case "dashboard.team":
      return role === "LEAD";

    case "dashboard.member":
      return role === "LEAD" || role === "MEMBER" || role === "GENERAL_MEMBER";

    // All authenticated users can read tasks, users directory, teams, events, settings, workloads
    case "tasks.list":
    case "tasks.get":
    case "users.list":
    case "users.get":
    case "settings.get":
    case "teams.list":
    case "teams.get":
    case "events.list":
    case "events.get":
    case "templates.list":
    case "templates.get":
    case "tasks.getUserWorkload":
    case "templates.previewTasks":
      return true;

    case "tasks.create":
    case "tasks.assign":
      return role === "LEAD";

    case "tasks.update":
    case "tasks.updateStatus":
    case "tasks.updateProgress":
    case "tasks.submitForVerification":
      // A Lead can only update tasks in their own department
      if (role === "LEAD" && resourceContext && resourceContext.teamId === teamId) return true;
      // The task creator (assignedBy) or assigned operator (assignedTo) can update
      if (resourceContext) {
        if (resourceContext.assignedBy === userId) return true;
        if (resourceContext.assignedTo === userId) return true;
      }
      return false;

    case "tasks.delete":
      // Task can be deleted by the user who created it (assignedBy) or executive
      if (resourceContext && resourceContext.assignedBy === userId) return true;
      return false;

    case "tasks.verify":
    case "tasks.reject":
      // Leads for their own team, designated verifier, or task creator
      if (role === "LEAD" && resourceContext && resourceContext.teamId === teamId) return true;
      if (resourceContext) {
        if (resourceContext.verifierId === userId || resourceContext.assignedBy === userId) return true;
      }
      return false;

    case "events.create":
    case "events.update":
      if (role === "LEAD") return true;
      if (resourceContext && resourceContext.createdBy === userId) return true;
      return false;

    case "events.delete":
    case "events.cancel":
      if (resourceContext && resourceContext.createdBy === userId) return true;
      return false;

    case "issues.create":
      return role === "LEAD" || role === "MEMBER" || role === "GENERAL_MEMBER";

    case "issues.update":
      if (role === "LEAD") return true;
      return resourceContext && resourceContext.createdBy === userId;

    default:
      // Default: reject anything else
      return false;
  }
}
