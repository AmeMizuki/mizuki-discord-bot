const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'reaction_roles.json');

// Load reaction roles from file
function loadReactionRoles() {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const data = fs.readFileSync(STORAGE_FILE, 'utf8');
			return JSON.parse(data);
		}
	}
	catch (error) {
		console.error('Error loading reaction roles:', error);
	}
	return {};
}

// Save reaction roles to file
function saveReactionRoles(reactionRoles) {
	try {
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(reactionRoles, null, 2));
		return true;
	}
	catch (error) {
		console.error('Error saving reaction roles:', error);
		return false;
	}
}

module.exports = {
	loadReactionRoles,
	saveReactionRoles,
};