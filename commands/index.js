// Import all command modules
const { imageCommands, handleFindDataCommand, handleViewImageInfoCommand, handleFavoriteImageCommand } = require('./imageCommands');
const { channelCommands, handleSetChannelCommand } = require('./channelCommands');
const { reactionCommands, handleReactMessageCommand } = require('./reactionCommands');
const { messageCommands, handleDeleteMessageCommand, handleRemoveBotReactionsCommand } = require('./messageCommands');

// Combine all commands
const commands = [
	...imageCommands,
	...channelCommands,
	...reactionCommands,
	...messageCommands,
].map(command => command.toJSON());

module.exports = {
	commands,
	handleFindDataCommand,
	handleSetChannelCommand,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
	handleReactMessageCommand,
	handleDeleteMessageCommand,
	handleRemoveBotReactionsCommand,
};