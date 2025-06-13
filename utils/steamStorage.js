const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'steam_channels.json');

// Save Steam monitored channels to file
function saveSteamMonitoredChannels(channels) {
	try {
		// Ensure channels is an array
		if (!Array.isArray(channels)) {
			throw new Error('Invalid channels data. Must be an array.');
		}

		const data = {
			channels: channels,
			lastUpdated: new Date().toISOString(),
		};
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
		return true;
	}
	catch (error) {
		console.error('Error saving Steam monitored channels:', error);
		return false;
	}
}

// Load Steam monitored channels from file
function loadSteamMonitoredChannels() {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const data = fs.readFileSync(STORAGE_FILE, 'utf8');
			const parsed = JSON.parse(data);

			// Check if parsed data and channels property exist
			if (parsed && typeof parsed === 'object' && Array.isArray(parsed.channels)) {
				return parsed.channels;
			}
		}
	}
	catch (error) {
		console.error('Error loading Steam monitored channels:', error);
	}
	// Return empty array if file doesn't exist, is malformed, or has no channels
	return [];
}

module.exports = {
	loadSteamMonitoredChannels,
	saveSteamMonitoredChannels,
};