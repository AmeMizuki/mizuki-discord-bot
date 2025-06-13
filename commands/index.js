// Import all command modules
const { imageCommands, handleViewImageInfoCommand, handleFavoriteImageCommand } = require('./imageCommands');
const { channelCommands, handleSetImageCommand } = require('./channelCommands');
const { reactionCommands, handleReactMessageCommand } = require('./reactionCommands');
const { messageCommands, handleDeleteMessageCommand, handleRemoveBotReactionsCommand } = require('./messageCommands');
const { steamCommands, handleSteamCommand } = require('./steamCommands');

// Combine all commands
const commands = [
	...imageCommands,
	...channelCommands,
	...reactionCommands,
	...messageCommands,
	...steamCommands,
].map(command => command.toJSON());

module.exports = {
	commands,
	handleSetImageCommand,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
	handleReactMessageCommand,
	handleDeleteMessageCommand,
	handleRemoveBotReactionsCommand,
	handleSteamCommand,
};