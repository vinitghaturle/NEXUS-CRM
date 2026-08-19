// Router.gs — Main HTTP POST entrypoint (doPost) for routing API calls.
// All client requests go through this file, which parses actions and delegates execution.

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseError("BAD_REQUEST", "Missing post data content.");
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
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
    
    // Router logic will go here to delegate to appropriate handlers based on action.
    return responseSuccess({ message: "Router initialized, action received: " + action });
  } catch (err) {
    return responseError("ROUTER_ERROR", err.toString());
  }
}
