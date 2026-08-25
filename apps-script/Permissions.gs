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
    case "tasks.update":
      if (role === "LEAD") {
        // Leads can create/assign/update tasks
        return true;
      }
      return false;

    case "tasks.updateStatus":
    case "tasks.updateProgress":
    case "tasks.submitForVerification":
      // Leads and Members can update task status/progress and submit for verification
      return role === "LEAD" || role === "MEMBER" || role === "GENERAL_MEMBER";

    case "tasks.verify":
    case "tasks.reject":
      // Leads (plus President, VP, Admin) can verify or reject tasks
      return role === "LEAD";

    case "events.create":
    case "events.update":
    case "events.cancel":
      return role === "LEAD";

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
