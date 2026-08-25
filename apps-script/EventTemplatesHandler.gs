// EventTemplatesHandler.gs — Core handlers for event templates retrieval (20_Event_Templates sheet).

/**
 * Returns all active event templates.
 * @returns {Array<Object>} List of templates
 */
function handleListTemplates() {
  var repo = new SheetRepository("20_Event_Templates", null, "templateId");
  return repo.getAll();
}

/**
 * Retrieves details for a single template by ID.
 * @param {string} templateId - Unique ID of the template
 * @returns {Object} The template details
 */
function handleGetTemplate(templateId) {
  if (!templateId) {
    throw new Error("Missing template ID.");
  }
  var repo = new SheetRepository("20_Event_Templates", null, "templateId");
  var template = repo.getById(templateId);
  if (!template) {
    throw new Error("Template not found with ID: " + templateId);
  }
  return template;
}

/**
 * Generates a preview list of tasks for a given template and event date without writing to the database.
 * @param {string} templateId - Unique ID of the template
 * @param {string} eventDate - Proposed date of the event (ISO string or similar)
 * @returns {Array<Object>} List of preview task objects with calculated deadlines
 */
function handlePreviewTemplateTasks(templateId, eventDate) {
  if (!templateId || !eventDate) {
    throw new Error("Missing templateId or eventDate.");
  }
  
  var eventDateObj = new Date(eventDate);
  if (isNaN(eventDateObj.getTime())) {
    throw new Error("Invalid event date format: " + eventDate);
  }
  
  var templatesRepo = new SheetRepository("20_Event_Templates", null, "templateId");
  var templateTasks = templatesRepo.find({ templateId: templateId });
  
  var previewTasks = [];
  for (var i = 0; i < templateTasks.length; i++) {
    var templateTask = templateTasks[i];
    
    // Calculate offset deadline relative to eventDate
    var offsetDays = parseInt(templateTask.dayOffset, 10) || 0;
    var taskDeadline = new Date(eventDateObj.getTime());
    taskDeadline.setDate(eventDateObj.getDate() + offsetDays);
    
    previewTasks.push({
      taskTitle: templateTask.taskTitle,
      taskDescription: templateTask.taskDescription || "",
      teamId: templateTask.teamId || "",
      priority: templateTask.defaultPriority || "MEDIUM",
      dayOffset: offsetDays,
      deadline: taskDeadline
    });
  }
  
  return previewTasks;
}
