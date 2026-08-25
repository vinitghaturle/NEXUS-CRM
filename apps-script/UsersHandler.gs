// UsersHandler.gs — Core handlers for Users management (01_Users sheet).

/**
 * Returns all active users (filtered by SheetRepository.getAll()).
 * @returns {Array<Object>} List of user objects
 */
function handleListUsers() {
  var repo = new SheetRepository("01_Users", "USR", "userId");
  return repo.getAll();
}

/**
 * Retrieves details for a single user by ID.
 * @param {string} userId - Unique ID of the user
 * @returns {Object} The user details
 */
function handleGetUser(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }
  var repo = new SheetRepository("01_Users", "USR", "userId");
  var user = repo.getById(userId);
  if (!user) {
    throw new Error("User not found with ID: " + userId);
  }
  return user;
}

/**
 * Creates a new user record with auto-incremented USR-xxxxx ID.
 * @param {Object} userData - User details payload
 * @returns {Object} The newly created user record
 */
function handleCreateUser(userData) {
  if (!userData || !userData.firebaseUid || !userData.name || !userData.email) {
    throw new Error("Invalid payload: firebaseUid, name, and email are required.");
  }

  var repo = new SheetRepository("01_Users", "USR", "userId");

  // Validate uniqueness of email and firebaseUid
  var existing = repo.find({ email: userData.email });
  if (existing.length > 0) {
    throw new Error("A user with this email address already exists.");
  }
  
  var existingUid = repo.find({ firebaseUid: userData.firebaseUid });
  if (existingUid.length > 0) {
    throw new Error("A user with this Firebase UID already exists.");
  }

  var newRecord = {
    firebaseUid: userData.firebaseUid,
    name: userData.name,
    email: userData.email,
    phone: userData.phone || "",
    role: userData.role || "MEMBER",
    teamId: userData.teamId || "",
    position: userData.position || "",
    joinDate: userData.joinDate || "",
    profilePhotoUrl: userData.profilePhotoUrl || "",
    active: "TRUE"
  };

  return repo.insert(newRecord);
}

/**
 * Updates an existing user record.
 * @param {string} userId - Unique ID of the user to update
 * @param {Object} userData - Fields and values to update
 * @returns {Object} The updated user record
 */
function handleUpdateUser(userId, userData, operatorUserId) {
  if (!userId || !userData) {
    throw new Error("Missing user ID or update payload.");
  }

  var repo = new SheetRepository("01_Users", "USR", "userId");
  var existingUser = repo.getById(userId);
  if (!existingUser) {
    throw new Error("User not found with ID: " + userId);
  }
  
  var updateFields = {};
  if (userData.hasOwnProperty("firebaseUid")) updateFields.firebaseUid = userData.firebaseUid;
  if (userData.hasOwnProperty("name")) updateFields.name = userData.name;
  if (userData.hasOwnProperty("email")) updateFields.email = userData.email;
  if (userData.hasOwnProperty("phone")) updateFields.phone = userData.phone;
  if (userData.hasOwnProperty("role")) updateFields.role = userData.role;
  if (userData.hasOwnProperty("teamId")) updateFields.teamId = userData.teamId;
  if (userData.hasOwnProperty("position")) updateFields.position = userData.position;
  if (userData.hasOwnProperty("joinDate")) updateFields.joinDate = userData.joinDate;
  if (userData.hasOwnProperty("profilePhotoUrl")) updateFields.profilePhotoUrl = userData.profilePhotoUrl;
  var updatedUser = repo.update(userId, updateFields);

  // Log Audit trail if role, teamId, or active status changes
  var roleChanged = updateFields.hasOwnProperty("role") && updateFields.role !== existingUser.role;
  var teamChanged = updateFields.hasOwnProperty("teamId") && updateFields.teamId !== existingUser.teamId;
  var activeChanged = updateFields.hasOwnProperty("active") && updateFields.active !== existingUser.active;

  Logger.log("UpdateUser DEBUG: userId=" + userId + ", roleChanged=" + roleChanged + ", updateFields.role=" + updateFields.role + ", existingUser.role=" + existingUser.role);

  if (roleChanged || teamChanged || activeChanged) {
    logAudit(
      operatorUserId,
      "users.update",
      "Users",
      userId,
      { role: existingUser.role, teamId: existingUser.teamId, active: existingUser.active },
      { role: updatedUser.role, teamId: updatedUser.teamId, active: updatedUser.active },
      "SUCCESS"
    );
  }

  return updatedUser;
}

/**
 * Soft-deactivates a user (sets active to "FALSE").
 * @param {string} userId - Unique ID of the user to deactivate
 * @returns {Object} The deactivated user record
 */
function handleDeactivateUser(userId, operatorUserId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }
  var repo = new SheetRepository("01_Users", "USR", "userId");
  var existingUser = repo.getById(userId);
  
  // Calling repo.delete() automatically toggles active status to "FALSE" for 01_Users sheet
  var deactivatedUser = repo.delete(userId);

  // Log Audit trail
  logAudit(
    operatorUserId,
    "users.deactivate",
    "Users",
    userId,
    existingUser ? { active: existingUser.active } : "",
    { active: "FALSE" },
    "SUCCESS"
  );

  return deactivatedUser;
}
