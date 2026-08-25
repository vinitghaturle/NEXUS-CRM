// AuditLog.gs — Centralized audit logging utility.

/**
 * Logs a sensitive system mutation to the 19_Audit_Log sheet.
 * @param {string} userId - User ID of the operator performing the action
 * @param {string} action - The action identifier (e.g. "tasks.assign")
 * @param {string} entityType - The entity category (e.g. "Tasks")
 * @param {string} entityId - The unique identifier of the target record
 * @param {string|Object} previousValue - Previous state (stringified if object)
 * @param {string|Object} newValue - Proposed state (stringified if object)
 * @param {string} result - Execution result ("SUCCESS" or "FAILURE")
 */
function logAudit(userId, action, entityType, entityId, previousValue, newValue, result) {
  try {
    var auditRepo = new SheetRepository("19_Audit_Log", "AUD", "auditId");
    
    var prevStr = typeof previousValue === "object" ? JSON.stringify(previousValue) : String(previousValue || "");
    var newStr = typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue || "");
    
    var logRecord = {
      timestamp: new Date(),
      userId: userId || "SYSTEM",
      action: action || "",
      entityType: entityType || "",
      entityId: entityId || "",
      previousValue: prevStr,
      newValue: newStr,
      ipOrSessionReference: "",
      result: result || "SUCCESS"
    };
    
    auditRepo.insert(logRecord);
    Logger.log("Audit log written: " + action + " for " + entityType + " (" + entityId + ")");
  } catch (err) {
    Logger.log("Failed to write audit log: " + err.toString());
  }
}
