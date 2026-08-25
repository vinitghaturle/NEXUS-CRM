// Config.gs — Central configuration constants for NEXUS CRM
// Stores Spreadsheet ID, Google Drive Root Folder ID, Timezone, and system constants.

var SPREADSHEET_ID = "1IpDz9NojvLDMEfWIVEGinuAjJQZVF0fh9SywxyNNRQw"; // Configured in Script Properties or updated here
var TIMEZONE = "Asia/Kolkata";
var FIREBASE_API_KEY = PropertiesService.getScriptProperties().getProperty("FIREBASE_API_KEY") || "AIzaSyD12jcZsYKox3J9DCNpYxfFIF30zs0xHBQ";

// Settings keys from 00_Settings
var SETTINGS_KEYS = {
  TASK_STATUS_COMPLETED: "TASK_STATUS_COMPLETED",
  TASK_STATUS_IN_PROGRESS: "TASK_STATUS_IN_PROGRESS",
  TASK_STATUS_NOT_STARTED: "TASK_STATUS_NOT_STARTED",
  TASK_STATUS_DELAYED: "TASK_STATUS_DELAYED",
  TASK_STATUS_BLOCKED: "TASK_STATUS_BLOCKED",
  PRIORITY_LOW: "PRIORITY_LOW",
  PRIORITY_MEDIUM: "PRIORITY_MEDIUM",
  PRIORITY_HIGH: "PRIORITY_HIGH",
  PRIORITY_CRITICAL: "PRIORITY_CRITICAL"
};
