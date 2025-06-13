const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'image_channels.json');

// Save monitored channels to file
function saveMonitoredChannels(channels) {
	try {
		// Ensure channels is an object
		if (typeof channels !== 'object' || channels === null || Array.isArray(channels)) {
			throw new Error('Invalid channels data. Must be an object.');
		}

		const data = {
			channels: channels,
			lastUpdated: new Date().toISOString(),
		};
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
		return true;
	}
	catch (error) {
		console.error('Error saving monitored channels:', error);
		return false;
	}
}

// Load monitored channels from file
function loadMonitoredChannels() {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const data = fs.readFileSync(STORAGE_FILE, 'utf8');
			const parsed = JSON.parse(data);

			// Check if parsed data and channels property exist
			if (parsed && typeof parsed === 'object') {
				// Handle migration from old format (array of strings) to new format (object)
				if (Array.isArray(parsed.channels)) {
					const migratedChannels = {};
					for (const channelId of parsed.channels) {
						migratedChannels[channelId] = { image: true, text: false };
					}
					saveMonitoredChannels(migratedChannels);
					return migratedChannels;
				}
				// New format (object)
				if (typeof parsed.channels === 'object' && parsed.channels !== null && !Array.isArray(parsed.channels)) {
					return parsed.channels;
				}
			}
		}
	}
	catch (error) {
		console.error('Error loading monitored channels:', error);
	}
	return {};
	// Return empty object if file doesn't exist, is malformed, or has no channels
}

module.exports = {
	loadMonitoredChannels,
	saveMonitoredChannels,
};