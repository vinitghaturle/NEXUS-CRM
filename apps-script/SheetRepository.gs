// SheetRepository.gs — Centralized Data Access Layer for Google Sheets.
// Implements CRUD operations, memory-batching, caching, and server-side ID auto-generation.

/**
 * Creates a SheetRepository instance.
 * @param {string} sheetName - The exact tab name (e.g. "04_Tasks")
 * @param {string} idPrefix - Prefix for auto-generating IDs (e.g. "TSK"). Can be null/empty if not auto-generated.
 * @param {string} idColumnName - Primary ID key column name (e.g. "taskId").
 * @constructor
 */
function SheetRepository(sheetName, idPrefix, idColumnName) {
  this.sheetName = sheetName;
  this.idPrefix = idPrefix;
  this.idColumnName = idColumnName;
}

SheetRepository.prototype = {
  /**
   * Helper to open the active sheet.
   * @private
   */
  _getSheet: function() {
    var ss;
    if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) {
      throw new Error("Spreadsheet could not be opened. SPREADSHEET_ID is missing or invalid.");
    }
    
    var sheet = ss.getSheetByName(this.sheetName);
    if (!sheet) {
      throw new Error("Sheet tab not found: " + this.sheetName);
    }
    return sheet;
  },

  /**
   * Identifies if the sheet data is safe and useful to cache.
   * Cached tables: 00_Settings, 01_Users, 02_Teams, 20_Event_Templates.
   * @private
   */
  _isCacheable: function() {
    return (this.sheetName === "00_Settings" || 
            this.sheetName === "01_Users" || 
            this.sheetName === "02_Teams" || 
            this.sheetName === "20_Event_Templates");
  },

  /**
   * Clears the cache for the current sheet.
   * @private
   */
  _clearCache: function() {
    if (this._isCacheable()) {
      try {
        var cache = CacheService.getScriptCache();
        cache.remove(this.sheetName);
        Logger.log("Cleared cache for sheet: " + this.sheetName);
      } catch (e) {
        Logger.log("Failed to clear cache: " + e.toString());
      }
    }
  },

  /**
   * Fetches headers and data in a single batch read, with caching if enabled.
   * @private
   */
  _getData: function() {
    if (this._isCacheable()) {
      try {
        var cached = CacheService.getScriptCache().get(this.sheetName);
        if (cached) {
          Logger.log("Using cached data for sheet: " + this.sheetName);
          return JSON.parse(cached);
        }
      } catch (e) {
        Logger.log("Cache retrieval failed: " + e.toString());
      }
    }

    var sheet = this._getSheet();
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    // Read real headers from row 1 if available
    var headers = [];
    if (lastColumn > 0) {
      var rawHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      for (var h = 0; h < rawHeaders.length; h++) {
        if (rawHeaders[h] && String(rawHeaders[h]).trim() !== "") {
          headers.push(String(rawHeaders[h]).trim());
        } else {
          break;
        }
      }
    }
    if (headers.length === 0) {
      headers = this._getSchemaHeaders();
    }

    if (lastRow <= 1) {
      return { headers: headers, rows: [] };
    }

    // Read the entire dataset in a single getValues call
    var values = sheet.getRange(1, 1, lastRow, headers.length).getValues();
    var rows = [];

    for (var i = 1; i < values.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      rows.push(row);
    }

    var data = { headers: headers, rows: rows };

    if (this._isCacheable()) {
      try {
        var cache = CacheService.getScriptCache();
        cache.put(this.sheetName, JSON.stringify(data), 1800); // 30 minutes cache
        Logger.log("Saved sheet data to cache: " + this.sheetName);
      } catch (e) {
        Logger.log("Failed to save data to cache: " + e.toString());
      }
    }

    return data;
  },

  /**
   * Retrieves the default schema headers based on Setup.gs.
   * @private
   */
  _getSchemaHeaders: function() {
    var schemas = {
      "00_Settings": ["settingKey", "settingValue", "description", "active"],
      "01_Users": ["userId", "firebaseUid", "name", "email", "phone", "role", "teamId", "position", "active", "joinDate", "profilePhotoUrl", "createdAt", "updatedAt"],
      "02_Teams": ["teamId", "teamName", "teamCode", "leadUserId", "description", "active", "createdAt", "updatedAt"],
      "03_Events": ["eventId", "eventName", "eventCategory", "eventDate", "startTime", "endTime", "venue", "leadTeamId", "supportingTeamIds", "eventStatus", "description", "createdBy", "createdAt", "updatedAt", "registrationStartDate", "registrationEndDate", "permissionDeadline", "creativeDeadline", "formDeadline", "promotionStartDate", "eventReportDeadline", "driveFolderUrl"],
      "04_Tasks": ["taskId", "eventId", "projectId", "taskTitle", "taskDescription", "teamId", "assignedTo", "assignedBy", "verifierId", "priority", "startDate", "deadline", "status", "completionPercent", "departmentAssignments", "remarks", "rejectionRemarks", "completionDate", "driveLink", "isAutoGenerated", "sourceTemplateId", "createdAt", "updatedAt"],
      "05_Task_Updates": ["updateId", "taskId", "updatedBy", "previousStatus", "newStatus", "previousCompletion", "newCompletion", "remarks", "updatedAt"],
      "06_Creative": ["creativeId", "eventId", "creativeType", "title", "designerId", "contentOwnerId", "contentReceived", "designStarted", "reviewStatus", "approved", "published", "deadline", "postingDate", "assetUrl", "remarks", "createdAt", "updatedAt"],
      "07_Social_Media": ["contentId", "contentType", "eventId", "title", "platform", "responsiblePerson", "contentDeadline", "designDeadline", "approvalStatus", "postingDate", "status", "publishedUrl", "remarks", "createdAt", "updatedAt"],
      "08_Newsletter": ["newsletterId", "month", "year", "theme", "contentOwner", "designer", "deadline", "approvalStatus", "published", "publishedDate", "driveUrl", "remarks"],
      "09_Birthdays": ["birthdayId", "facultyName", "department", "birthday", "month", "posterAssigned", "contentAssigned", "designDeadline", "approvalStatus", "postingDate", "status", "remarks"],
      "10_Achievements": ["achievementId", "name", "department", "achievement", "category", "achievementDate", "proofUrl", "contentWriterId", "designerId", "approvalStatus", "postingDate", "instagramUrl", "createdAt", "updatedAt"],
      "11_Forms": ["formId", "formName", "eventId", "ownerId", "creationDeadline", "launchDate", "closingDate", "responseCount", "status", "formUrl", "responseSheetUrl", "createdAt", "updatedAt"],
      "12_Issues": ["issueId", "issueTitle", "eventId", "teamId", "severity", "dateRaised", "actionRequired", "ownerId", "deadline", "resolution", "status", "createdBy", "createdAt", "updatedAt"],
      "13_Meetings": ["meetingId", "title", "meetingDate", "startTime", "endTime", "meetingType", "location", "agenda", "decision", "responsiblePerson", "momAssigneeId", "momAssigneeName", "momDocUrl", "deadline", "targetTeamIds", "status", "remarks", "reminderSent", "createdBy", "createdAt"],
      "14_Budget": ["budgetId", "eventId", "category", "description", "estimatedBudget", "actualExpense", "amountPaid", "pendingAmount", "vendor", "sponsor", "invoiceUrl", "approvalStatus", "approvedBy", "createdAt", "updatedAt"],
      "15_Recognition": ["recognitionId", "userId", "recognitionType", "month", "year", "reason", "eventId", "volunteerHours", "approvedBy", "certificateUrl", "createdAt"],
      "16_Documents": ["documentId", "eventId", "documentType", "documentName", "driveUrl", "uploadedBy", "uploadedAt", "description"],
      "17_Reports": ["reportId", "reportType", "periodStart", "periodEnd", "generatedAt", "generatedBy", "summary", "reportUrl"],
      "18_Performance": ["performanceId", "userId", "period", "taskCompletionScore", "onTimeScore", "eventParticipationScore", "meetingAttendanceScore", "initiativeScore", "teamCoordinationScore", "responsibilityScore", "communicationScore", "qualityScore", "consistencyScore", "overallScore", "remarks", "evaluatedBy", "evaluatedAt"],
      "19_Audit_Log": ["auditId", "timestamp", "userId", "action", "entityType", "entityId", "previousValue", "newValue", "ipOrSessionReference", "result"],
      "20_Event_Templates": ["templateId", "templateName", "taskTitle", "taskDescription", "dayOffset", "teamId", "defaultPriority", "required", "active"],
      "21_Dashboard_Data": ["metricKey", "metricValue", "calculatedAt"],
      "22_Notifications": ["notificationId", "eventType", "taskId", "eventId", "recipientUserId", "recipientEmail", "subject", "status", "sentAt", "errorMessage", "createdAt"]
    };
    return schemas[this.sheetName] || [];
  },

  /**
   * Generates a unique, server-side auto-incremented ID with formatting (e.g. TSK-00001).
   * Scans all rows, including soft-deleted ones, to guarantee no collision.
   * @private
   */
  _generateNextId: function() {
    var maxIdNum = 0;
    var prefix = this.idPrefix + "-";
    var data = this._getData();
    var detectedPadding = 5; // Default fallback to 5

    for (var i = 0; i < data.rows.length; i++) {
      var idVal = data.rows[i][this.idColumnName];
      if (idVal && String(idVal).indexOf(prefix) === 0) {
        var numPart = String(idVal).substring(prefix.length);
        if (numPart.length > 0) {
          detectedPadding = numPart.length;
        }
        var num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      }
    }

    var nextNum = maxIdNum + 1;
    var padString = "0000000000".substring(0, detectedPadding);
    var paddedNum = (padString + nextNum).slice(-detectedPadding);
    return prefix + paddedNum;
  },

  /**
   * Retrieves all active (non-soft-deleted) records.
   * Rules: active=FALSE, status=CANCELLED, archived=TRUE represent soft-deleted states.
   */
  getAll: function() {
    var data = this._getData();
    var self = this;

    return data.rows.filter(function(row) {
      // 01_Users and 02_Teams soft-delete: active === FALSE / "FALSE"
      if (row.hasOwnProperty("active")) {
        var act = String(row.active || "").trim().toUpperCase();
        if (row.active === false || act === "FALSE") {
          return false;
        }
      }
      // 04_Tasks, 12_Issues, 13_Meetings soft-delete: status === CANCELLED / "CANCELLED"
      if (row.hasOwnProperty("status")) {
        var stat = String(row.status || "").trim().toUpperCase();
        if (stat === "CANCELLED") {
          return false;
        }
      }
      // 03_Events soft-delete: eventStatus === CANCELLED
      if (row.hasOwnProperty("eventStatus")) {
        var evtStat = String(row.eventStatus || "").trim().toUpperCase();
        if (evtStat === "CANCELLED") {
          return false;
        }
      }
      // Documents soft-delete: archived === TRUE / "TRUE"
      if (row.hasOwnProperty("archived")) {
        var arch = String(row.archived || "").trim().toUpperCase();
        if (row.archived === true || arch === "TRUE") {
          return false;
        }
      }
      return true;
    });
  },

  /**
   * Retrieves a record by its unique ID.
   * @param {string} id - The primary key ID to search for
   */
  getById: function(id) {
    var records = this.getAll();
    for (var i = 0; i < records.length; i++) {
      if (records[i][this.idColumnName] === id) {
        return records[i];
      }
    }
    return null;
  },

  /**
   * Finds records matching a given query object (exact match filter).
   * Supports loose boolean matching (e.g., true matches "TRUE").
   * @param {Object} queryObject - Keys and values to filter by (e.g. { teamId: "TEAM-001" })
   */
  find: function(queryObject) {
    var records = this.getAll();
    return records.filter(function(row) {
      for (var key in queryObject) {
        var rowVal = row[key];
        var queryVal = queryObject[key];
        
        var isRowBool = (rowVal === true || rowVal === false || String(rowVal).toUpperCase() === "TRUE" || String(rowVal).toUpperCase() === "FALSE");
        var isQueryBool = (queryVal === true || queryVal === false || String(queryVal).toUpperCase() === "TRUE" || String(queryVal).toUpperCase() === "FALSE");
        
        if (isRowBool && isQueryBool) {
          var rowBoolVal = (rowVal === true || String(rowVal).toUpperCase() === "TRUE");
          var queryBoolVal = (queryVal === true || String(queryVal).toUpperCase() === "TRUE");
          if (rowBoolVal !== queryBoolVal) {
            return false;
          }
        } else {
          if (rowVal !== queryVal) {
            return false;
          }
        }
      }
      return true;
    });
  },

  /**
   * Inserts a record. Auto-generates ID if idPrefix is configured.
   * @param {Object} record - The item to insert
   */
  insert: function(record) {
    var sheet = this._getSheet();
    var data = this._getData();
    var headers = data.headers;

    // Server-generates the ID if applicable
    if (this.idPrefix && this.idColumnName) {
      record[this.idColumnName] = this._generateNextId();
    }

    var now = new Date();
    if (headers.indexOf("createdAt") !== -1) record.createdAt = now;
    if (headers.indexOf("updatedAt") !== -1) record.updatedAt = now;

    // Construct the row in correct header order
    var rowValues = [];
    for (var i = 0; i < headers.length; i++) {
      var key = headers[i];
      rowValues.push(record.hasOwnProperty(key) ? record[key] : "");
    }

    // Append to sheet in one operation
    Logger.log("Appending row to " + this.sheetName + " with headers: " + JSON.stringify(headers) + " and values: " + JSON.stringify(rowValues));
    sheet.appendRow(rowValues);

    // Apply column date and datetime formats
    applyNumberFormats(sheet, headers);
    SpreadsheetApp.flush();
    
    // Clear cache AFTER writing to prevent caching stale data
    this._clearCache();

    return record;
  },

  /**
   * Updates a record by ID.
   * @param {string} id - Primary key value of the record
   * @param {Object} updatedFields - Fields and values to update
   */
  update: function(id, updatedFields) {
    var sheet = this._getSheet();
    var data = this._getData();
    var headers = data.headers;

    // Find the row index (2-indexed since row 1 is header)
    var rowIndex = -1;
    for (var i = 0; i < data.rows.length; i++) {
      if (data.rows[i][this.idColumnName] === id) {
        rowIndex = i + 2; // +1 for 0-index array, +1 for header row
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error("Record not found with ID: " + id + " in sheet: " + this.sheetName);
    }

    var now = new Date();
    if (headers.indexOf("updatedAt") !== -1) {
      updatedFields.updatedAt = now;
    }

    // Read full row range in a single call to preserve unchanged columns
    var rowRange = sheet.getRange(rowIndex, 1, 1, headers.length);
    var rowValues = rowRange.getValues()[0];

    // Apply updates
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j];
      if (updatedFields.hasOwnProperty(headerName)) {
        rowValues[j] = updatedFields[headerName];
      }
    }

    // Write full row back in a single operation
    rowRange.setValues([rowValues]);

    // Reapply formats
    applyNumberFormats(sheet, headers);
    SpreadsheetApp.flush();
    
    // Clear cache AFTER writing to prevent caching stale data
    this._clearCache();

    // Build and return the updated record object
    var updatedRecord = {};
    for (var k = 0; k < headers.length; k++) {
      updatedRecord[headers[k]] = rowValues[k];
    }
    return updatedRecord;
  },

  /**
   * Soft deletes a record by ID.
   * Toggles active status depending on the sheet configuration.
   * @param {string} id - Primary key value of the record
   */
  delete: function(id) {
    var record = this.getById(id);
    if (!record) {
      throw new Error("Cannot delete. Record not found with ID: " + id + " in sheet: " + this.sheetName);
    }

    var softDeleteUpdate = {};
    if (record.hasOwnProperty("active")) {
      softDeleteUpdate.active = "FALSE";
    } else if (record.hasOwnProperty("status") && this.sheetName === "04_Tasks") {
      softDeleteUpdate.status = "CANCELLED";
    } else if (record.hasOwnProperty("eventStatus") && this.sheetName === "03_Events") {
      softDeleteUpdate.eventStatus = "CANCELLED";
    } else if (record.hasOwnProperty("archived")) {
      softDeleteUpdate.archived = "TRUE";
    } else {
      throw new Error("No soft-delete flag column identified for sheet: " + this.sheetName);
    }

    return this.update(id, softDeleteUpdate);
  }
};
