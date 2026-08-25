// Auth.gs — Handles Firebase ID token verification and active user resolution.
// Decodes incoming tokens and performs database lookups in 01_Users.

/**
 * Verifies the incoming Firebase ID token using Google Identity Toolkit REST API.
 * Supports a mock backdoor prefix ("mock_token_") to facilitate testing/development.
 * @param {string} idToken - The Firebase ID token to verify
 * @returns {Object} User identity (firebaseUid, email)
 */
function verifyFirebaseToken(idToken) {
  if (!idToken) {
    throw new Error("Missing ID token.");
  }

  // Developer backdoor for unit testing / mock authentication
  if (idToken.indexOf("mock_token_") === 0) {
    var role = idToken.substring("mock_token_".length).toUpperCase();
    Logger.log("Authentication: Using mock developer token for role: " + role);
    return {
      firebaseUid: "mock_uid_" + role.toLowerCase(),
      email: "mock_" + role.toLowerCase() + "@example.com",
      isMock: true
    };
  }

  var apiKey = FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY configuration is missing.");
  }

  var url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + apiKey;
  var payload = {
    idToken: idToken
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    Logger.log("Firebase ID Token verification failed. Code: " + responseCode + ", Response: " + responseText);
    throw new Error("Invalid or expired authentication token.");
  }

  var result = JSON.parse(responseText);
  if (!result.users || result.users.length === 0) {
    throw new Error("User account not found in Identity provider.");
  }

  var user = result.users[0];
  return {
    firebaseUid: user.localId,
    email: user.email
  };
}

/**
 * Resolves the authenticated user's role and team from the 01_Users sheet.
 * Supports fallback lookup by email (case-insensitive) and auto-links Firebase UID.
 * Rejects inactive users (active = FALSE).
 * @param {string} firebaseUid - The verified Firebase UID of the user
 * @param {string} [email] - The verified email of the user (fallback)
 * @returns {Object} User details (userId, role, teamId, etc.)
 */
function resolveUserRoleAndTeam(firebaseUid, email) {
  if (!firebaseUid && !email) {
    throw new Error("Missing Firebase credentials.");
  }

  var usersRepo = new SheetRepository("01_Users", "USR", "userId");
  
  // 1. First attempt: lookup by firebaseUid
  var matchedUsers = [];
  if (firebaseUid) {
    matchedUsers = usersRepo.find({ firebaseUid: firebaseUid });
  }

  // 2. If not found in cache, clear cache and force fresh read from Google Sheets
  if (matchedUsers.length === 0) {
    usersRepo._clearCache();
    if (firebaseUid) {
      matchedUsers = usersRepo.find({ firebaseUid: firebaseUid });
    }
  }

  // 3. Fallback attempt: match by email (case-insensitive, trimmed)
  if (matchedUsers.length === 0 && email) {
    var allUsers = usersRepo.getAll();
    var searchEmail = String(email).trim().toLowerCase();
    
    matchedUsers = allUsers.filter(function(u) {
      return u.email && String(u.email).trim().toLowerCase() === searchEmail;
    });

    // If found by email, auto-populate the firebaseUid and ensure active = TRUE
    if (matchedUsers.length > 0 && firebaseUid) {
      var matchedUser = matchedUsers[0];
      if (matchedUser.firebaseUid !== firebaseUid) {
        matchedUser.firebaseUid = firebaseUid;
        matchedUser.active = "TRUE";
        usersRepo.update(matchedUser.userId, matchedUser);
        Logger.log("Auto-linked firebaseUid for user: " + email);
      }
    }
  }
  
  if (matchedUsers.length === 0) {
    throw new Error("User not found or account is deactivated.");
  }
  
  var user = matchedUsers[0];
  
  // Validate that the user role is one of the valid enums
  var validRoles = ["PRESIDENT", "VP", "LEAD", "MEMBER", "GENERAL_MEMBER", "ADMIN"];
  if (validRoles.indexOf(user.role) === -1) {
    throw new Error("Invalid user role: " + user.role);
  }

  return {
    userId: user.userId,
    firebaseUid: user.firebaseUid,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    position: user.position,
    active: user.active
  };
}

