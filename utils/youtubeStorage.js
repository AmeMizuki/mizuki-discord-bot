const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'youtube_channels.json');

// Save YouTube monitored channels to file
function saveYouTubeMonitoredChannels(channels) {
	try {
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(channels, null, 2));
	}
	catch (error) {
		console.error('Error saving YouTube monitored channels:', error);
	}
}

// Load YouTube monitored channels from file
function loadYouTubeMonitoredChannels() {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const data = fs.readFileSync(STORAGE_FILE, 'utf8');
			return JSON.parse(data);
		}
	}
	catch (error) {
		console.error('Error loading YouTube monitored channels:', error);
	}
	return [];
}

module.exports = {
	loadYouTubeMonitoredChannels,
	saveYouTubeMonitoredChannels,
};