// TeamsHandler.gs — Core handlers for Teams management (02_Teams sheet).

/**
 * Returns all active teams.
 * @returns {Array<Object>} List of team objects
 */
function handleListTeams() {
  var repo = new SheetRepository("02_Teams", "TEAM", "teamId");
  return repo.getAll();
}

/**
 * Retrieves details for a single team.
 * @param {string} teamId - Unique ID of the team
 * @returns {Object} The team details
 */
function handleGetTeam(teamId) {
  if (!teamId) {
    throw new Error("Missing team ID.");
  }
  var repo = new SheetRepository("02_Teams", "TEAM", "teamId");
  var team = repo.getById(teamId);
  if (!team) {
    throw new Error("Team not found with ID: " + teamId);
  }
  return team;
}

/**
 * Creates a new team with server-side ID auto-generation.
 * @param {Object} teamData - The team data payload
 * @returns {Object} The newly created team record
 */
function handleCreateTeam(teamData) {
  if (!teamData || !teamData.teamName || !teamData.teamCode) {
    throw new Error("Invalid payload: teamName and teamCode are required.");
  }
  
  var repo = new SheetRepository("02_Teams", "TEAM", "teamId");
  
  var newRecord = {
    teamName: teamData.teamName,
    teamCode: teamData.teamCode.toUpperCase(),
    leadUserId: teamData.leadUserId || "",
    description: teamData.description || "",
    active: "TRUE"
  };

  return repo.insert(newRecord);
}

/**
 * Updates an existing team record by ID.
 * @param {string} teamId - Unique ID of the team to update
 * @param {Object} teamData - Fields and values to update
 * @returns {Object} The updated team record
 */
function handleUpdateTeam(teamId, teamData) {
  if (!teamId || !teamData) {
    throw new Error("Missing team ID or update payload.");
  }

  var repo = new SheetRepository("02_Teams", "TEAM", "teamId");
  
  var updateFields = {};
  if (teamData.hasOwnProperty("teamName")) updateFields.teamName = teamData.teamName;
  if (teamData.hasOwnProperty("teamCode")) updateFields.teamCode = teamData.teamCode.toUpperCase();
  if (teamData.hasOwnProperty("leadUserId")) updateFields.leadUserId = teamData.leadUserId;
  if (teamData.hasOwnProperty("description")) updateFields.description = teamData.description;
  if (teamData.hasOwnProperty("active")) updateFields.active = String(teamData.active).toUpperCase();

  return repo.update(teamId, updateFields);
}
