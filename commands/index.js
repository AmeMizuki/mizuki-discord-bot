// Import all command modules
const { imageCommands, handleViewImageInfoCommand, handleFavoriteImageCommand } = require('./imageCommands');
const { reactionCommands, handleReactMessageCommand } = require('./reactionCommands');
const { messageCommands, handleDeleteMessageCommand, handleRemoveBotReactionsCommand } = require('./messageCommands');
const { steamCommands, handleSteamCommand } = require('./steamCommands');
const { translateCommands, handleTranslateCommand } = require('./translateCommands');
const { gifCommands, handleConvertToGifCommand } = require('./gifCommands');

// Combine all commands
const commands = [
	...imageCommands,
	...reactionCommands,
	...messageCommands,
	...steamCommands,
	...translateCommands,
	...gifCommands,
].map(command => command.toJSON());

module.exports = {
	commands,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
	handleReactMessageCommand,
	handleDeleteMessageCommand,
	handleRemoveBotReactionsCommand,
	handleSteamCommand,
	handleTranslateCommand,
	handleConvertToGifCommand,
};