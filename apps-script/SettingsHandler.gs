// SettingsHandler.gs — Core handlers for system settings (00_Settings sheet).

/**
 * Returns all system settings as a flat key-value object.
 * @returns {Object} JSON settings configuration
 */
function handleGetSettings() {
  var repo = new SheetRepository("00_Settings", null, "settingKey");
  var settingsList = repo.getAll();
  
  var settingsMap = {};
  for (var i = 0; i < settingsList.length; i++) {
    var item = settingsList[i];
    settingsMap[item.settingKey] = item.settingValue;
  }
  return settingsMap;
}

/**
 * Updates multiple settings from a key-value dictionary.
 * @param {Object} updates - Dictionary of settings to update (e.g. { "system_theme": "dark" })
 * @returns {Object} Updated settings key-value map
 */
function handleUpdateSettings(updates) {
  if (!updates || typeof updates !== "object") {
    throw new Error("Invalid payload: settings update requires an object.");
  }

  var repo = new SheetRepository("00_Settings", null, "settingKey");
  var keys = Object.keys(updates);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = updates[key];
    
    // Check if settings record exists first
    var existing = repo.getById(key);
    if (!existing) {
      // If it doesn't exist, insert it as a new setting
      repo.insert({
        settingKey: key,
        settingValue: value,
        description: "Dynamically added configuration setting"
      });
    } else {
      // If it exists, update settingValue
      repo.update(key, { settingValue: value });
    }
  }

  // Return the newly synced settings mapping
  return handleGetSettings();
}
