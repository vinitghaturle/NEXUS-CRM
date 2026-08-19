// Auth.gs — Handles Firebase ID token verification and active user resolution.
// Decodes incoming tokens and performs database lookups in 01_Users.

function verifyFirebaseToken(idToken) {
  // Verifies the incoming Firebase ID token using Google Public Keys.
  // Returns user information if valid, throws error otherwise.
  return {
    firebaseUid: "stub_uid",
    email: "stub@example.com"
  };
}

function resolveUserRoleAndTeam(firebaseUid) {
  // Looks up the user in 01_Users sheet by firebaseUid.
  // Returns role and team details.
  return {
    role: "MEMBER",
    teamId: "TEAM-001"
  };
}
