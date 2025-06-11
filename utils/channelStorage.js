const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'monitored_channels.json');

// Load monitored channels from file
function loadMonitoredChannels() {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const data = fs.readFileSync(STORAGE_FILE, 'utf8');
			const parsed = JSON.parse(data);
			return Array.isArray(parsed.channels) ? parsed.channels : [];
		}
	}
	catch (error) {
		console.error('Error loading monitored channels:', error);
	}
	return [];
}

// Save monitored channels to file
function saveMonitoredChannels(channels) {
	try {
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

module.exports = {
	loadMonitoredChannels,
	saveMonitoredChannels,
};