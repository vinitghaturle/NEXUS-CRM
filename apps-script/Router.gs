// Router.gs — Main HTTP POST entrypoint (doPost) for routing API calls.
// All client requests go through this file, which parses actions and delegates execution.

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    // Router logic will go here to delegate to appropriate handlers based on action.
    return responseSuccess({ message: "Router initialized, action received: " + action });
  } catch (err) {
    return responseError("ROUTER_ERROR", err.toString());
  }
}
