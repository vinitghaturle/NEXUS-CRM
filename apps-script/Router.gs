// Router.gs — Main HTTP POST entrypoint (doPost) for routing API calls.
// All client requests go through this file, which parses actions and delegates execution.

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseError("BAD_REQUEST", "Missing post data content.");
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    // 1. Handle public actions (no authentication required)
    if (action === "system.setup") {
      setupNexusSpreadsheet();
      var ssId = "";
      try {
        ssId = SPREADSHEET_ID || SpreadsheetApp.getActiveSpreadsheet().getId();
      } catch (err) {
        // Fallback if not bound and no SPREADSHEET_ID configured yet
      }
      return responseSuccess({ 
        message: "Spreadsheet schema setup completed successfully.",
        spreadsheetId: ssId
      });
    }
    
    if (action === "system.createFirstAdmin") {
      var userRepo = new SheetRepository("01_Users", "USR", "userId");
      var existingAdmins = userRepo.find({ role: "PRESIDENT" });
      if (existingAdmins.length > 0) {
        // If the existing admin has the same email, update the UID and activate it
        var matchingAdmin = existingAdmins.filter(function(u) { return u.email === payload.payload.email; })[0];
        if (matchingAdmin) {
          matchingAdmin.firebaseUid = payload.payload.firebaseUid;
          matchingAdmin.active = "TRUE";
          userRepo.update(matchingAdmin.userId, matchingAdmin);
          return responseSuccess({
            message: "Existing administrator UID updated successfully.",
            user: matchingAdmin
          });
        }
        return responseError("FORBIDDEN", "An administrator already exists. This bootstrapping operation is locked.");
      }
      
      var insertedUser = userRepo.insert({
        firebaseUid: payload.payload.firebaseUid,
        name: payload.payload.name || "Default President",
        email: payload.payload.email,
        role: "PRESIDENT",
        active: "TRUE"
      });
      return responseSuccess({
        message: "First administrator created successfully.",
        user: insertedUser
      });
    }

    // 2. Authentication Wrapper (Middleware)
    if (!payload.auth || !payload.auth.idToken) {
      return responseError("UNAUTHENTICATED", "Missing authentication token.");
    }
    
    var authContext;
    try {
      authContext = verifyFirebaseToken(payload.auth.idToken);
    } catch (authErr) {
      return responseError("UNAUTHENTICATED", "Authentication failed: " + authErr.message);
    }
    
    var user;
    try {
      user = resolveUserRoleAndTeam(authContext.firebaseUid, authContext.email);
    } catch (userErr) {
      return responseError("FORBIDDEN", "Authorization failed: " + userErr.message);
    }
    
    // 3. Handle auth.me action
    if (action === "auth.me") {
      return responseSuccess({
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        position: user.position
      });
    }

    // Auto-populate context defaults for dashboard permissions check
    if (action === "dashboard.team" && payload.payload && !payload.payload.teamId) {
      payload.payload.teamId = user.teamId;
    }
    if (action === "dashboard.member" && payload.payload && !payload.payload.userId) {
      payload.payload.userId = user.userId;
    }
    
    // 4. Permission Checker Interceptor (for future protected domain handlers)
    // Extract resource context from payload if present (e.g. payload.payload)
    var resourceContext = payload.payload || {}; 
    if (!canUserPerform(user, action, resourceContext)) {
      return responseError("FORBIDDEN", "You do not have permission to perform this action.");
    }
    
    // 5. Route to specific feature handlers
    var responseData;
    switch (action) {
      // Settings Handlers
      case "settings.get":
        responseData = handleGetSettings();
        break;
      case "settings.update":
        responseData = handleUpdateSettings(payload.payload);
        break;
        
      // Teams Handlers
      case "teams.list":
        responseData = handleListTeams();
        break;
      case "teams.get":
        responseData = handleGetTeam(payload.payload.teamId);
        break;
      case "teams.create":
        responseData = handleCreateTeam(payload.payload);
        break;
      case "teams.update":
        responseData = handleUpdateTeam(payload.payload.teamId, payload.payload);
        break;
        
      // Users Handlers
      case "users.list":
        responseData = handleListUsers();
        break;
      case "users.get":
        responseData = handleGetUser(payload.payload.userId);
        break;
      case "users.create":
        responseData = handleCreateUser(payload.payload);
        break;
      case "users.update":
        responseData = handleUpdateUser(payload.payload.userId, payload.payload, user.userId);
        break;
      case "users.deactivate":
        responseData = handleDeactivateUser(payload.payload.userId, user.userId);
        break;
        
      // Events Handlers
      case "events.list":
        responseData = handleListEvents();
        break;
      case "events.get":
        responseData = handleGetEvent(payload.payload.eventId);
        break;
      case "events.create":
        responseData = handleCreateEvent(payload.payload, user.userId);
        break;
      case "events.update":
        responseData = handleUpdateEvent(payload.payload.eventId, payload.payload, user.userId);
        break;
      case "events.cancel":
        responseData = handleCancelEvent(payload.payload.eventId, user.userId);
        break;
      case "events.delete":
        responseData = handleDeleteEvent(payload.payload.eventId, user.userId);
        break;
        
      // Event Templates Handlers
      case "templates.list":
        responseData = handleListTemplates();
        break;
      case "templates.get":
        responseData = handleGetTemplate(payload.payload.templateId);
        break;
      case "templates.previewTasks":
        responseData = handlePreviewTemplateTasks(payload.payload.templateId, payload.payload.eventDate);
        break;
        
      // Dashboard Handlers
      case "dashboard.executive":
        responseData = handleGetExecutiveDashboard();
        break;
      case "dashboard.team":
        responseData = handleGetTeamDashboard(payload.payload.teamId);
        break;
      case "dashboard.member":
        responseData = handleGetMemberDashboard(payload.payload.userId);
        break;
        
      // Tasks Handlers
      case "tasks.list":
        responseData = handleListTasks();
        break;
      case "tasks.get":
        responseData = handleGetTask(payload.payload.taskId);
        break;
      case "tasks.create":
        responseData = handleCreateTask(payload.payload, user.userId);
        break;
      case "tasks.update":
        responseData = handleUpdateTask(payload.payload.taskId, payload.payload, user.userId);
        break;
      case "tasks.delete":
        responseData = handleDeleteTask(payload.payload.taskId, user.userId);
        break;
      case "tasks.updateStatus":
        responseData = handleUpdateTaskStatus(payload.payload.taskId, payload.payload.status, payload.payload.remarks, user.userId);
        break;
      case "tasks.updateProgress":
        responseData = handleUpdateTaskProgress(payload.payload.taskId, payload.payload.completionPercent, payload.payload.remarks, user.userId);
        break;
      case "tasks.getUserWorkload":
        responseData = handleGetUserWorkload(payload.payload.targetUserId);
        break;
      case "tasks.submitForVerification":
        responseData = handleTaskSubmitForVerification(payload.payload.taskId, payload.payload.verifierId, payload.payload.remarks, user.userId);
        break;
      case "tasks.verify":
        responseData = handleTaskVerify(payload.payload.taskId, payload.payload.remarks, user.userId);
        break;
      case "tasks.reject":
        responseData = handleTaskReject(payload.payload.taskId, payload.payload.remarks, user.userId);
        break;

      // Creative Handlers
      case "creative.list":
        responseData = handleListCreative();
        break;
      case "creative.create":
        responseData = handleCreateCreative(payload.payload, user.userId);
        break;
      case "creative.update":
        responseData = handleUpdateCreative(payload.payload.creativeId, payload.payload, user.userId);
        break;

      // Social Media Handlers
      case "social.list":
        responseData = handleListSocial();
        break;
      case "social.create":
        responseData = handleCreateSocial(payload.payload, user.userId);
        break;
      case "social.update":
        responseData = handleUpdateSocial(payload.payload.contentId, payload.payload, user.userId);
        break;

      // Newsletter Handlers
      case "newsletter.list":
        responseData = handleListNewsletter();
        break;
      case "newsletter.create":
        responseData = handleCreateNewsletter(payload.payload, user.userId);
        break;
      case "newsletter.update":
        responseData = handleUpdateNewsletter(payload.payload.newsletterId, payload.payload, user.userId);
        break;

      // Birthdays Handlers
      case "birthdays.list":
        responseData = handleListBirthdays();
        break;
      case "birthdays.create":
        responseData = handleCreateBirthday(payload.payload, user.userId);
        break;
      case "birthdays.update":
        responseData = handleUpdateBirthday(payload.payload.birthdayId, payload.payload, user.userId);
        break;

      // Achievements Handlers
      case "achievements.list":
        responseData = handleListAchievements();
        break;
      case "achievements.create":
        responseData = handleCreateAchievement(payload.payload, user.userId);
        break;
      case "achievements.update":
        responseData = handleUpdateAchievement(payload.payload.achievementId, payload.payload, user.userId);
        break;

      // Forms Handlers
      case "forms.list":
        responseData = handleListForms();
        break;
      case "forms.create":
        responseData = handleCreateForm(payload.payload, user.userId);
        break;
      case "forms.update":
        responseData = handleUpdateForm(payload.payload.formId, payload.payload, user.userId);
        break;

      // Issues Handlers
      case "issues.list":
        responseData = handleListIssues();
        break;
      case "issues.create":
        responseData = handleCreateIssue(payload.payload, user.userId);
        break;
      case "issues.update":
        responseData = handleUpdateIssue(payload.payload.issueId, payload.payload, user.userId);
        break;

      // Meetings Handlers
      case "meetings.list":
        responseData = handleListMeetings();
        break;
      case "meetings.create":
        responseData = handleCreateMeeting(payload.payload, user.userId);
        break;
      case "meetings.update":
        responseData = handleUpdateMeeting(payload.payload.meetingId, payload.payload, user.userId);
        break;

      // Documents Handlers
      case "documents.list":
        responseData = handleListDocuments();
        break;
      case "documents.create":
        responseData = handleCreateDocument(payload.payload, user.userId);
        break;

      // Budget Handlers
      case "budget.list":
        responseData = handleListBudget();
        break;
      case "budget.create":
        responseData = handleCreateBudget(payload.payload, user.userId);
        break;
      case "budget.update":
        responseData = handleUpdateBudget(payload.payload.budgetId, payload.payload, user.userId);
        break;

      // Recognition Handlers
      case "recognition.list":
        responseData = handleListRecognition();
        break;
      case "recognition.create":
        responseData = handleCreateRecognition(payload.payload, user.userId);
        break;
      case "recognition.update":
        responseData = handleUpdateRecognition(payload.payload.recognitionId, payload.payload, user.userId);
        break;

      // Performance Handlers
      case "performance.list":
        responseData = handleListPerformance(user);
        break;
      case "performance.get":
        responseData = handleGetPerformance(payload.payload.performanceId, user);
        break;
      case "performance.update":
        responseData = handleUpdatePerformance(payload.payload.performanceId, payload.payload, user);
        break;

      // Reports Handlers
      case "reports.list":
        responseData = handleListReports();
        break;
      case "reports.generate":
        responseData = handleGenerateReport(payload.payload, user.userId);
        break;
        
      default:
        return responseError("NOT_FOUND", "Action handler not found: " + action);
    }
    
    return responseSuccess(responseData);
    
  } catch (err) {
    return responseError("ROUTER_ERROR", err.toString());
  }
}
