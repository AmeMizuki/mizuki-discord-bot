// Import all command modules
const { imageCommands, handleViewImageInfoCommand, handleFavoriteImageCommand } = require('./imageCommands');
const { channelCommands, handleSetImageCommand } = require('./channelCommands');
const { reactionCommands, handleReactMessageCommand } = require('./reactionCommands');
const { messageCommands, handleDeleteMessageCommand, handleRemoveBotReactionsCommand } = require('./messageCommands');
const { steamCommands, handleSteamCommand } = require('./steamCommands');
const { youtubeCommands, handleYouTubeCommand } = require('./youtubeCommands');

// Combine all commands
const commands = [
	...imageCommands,
	...channelCommands,
	...reactionCommands,
	...messageCommands,
	...steamCommands,
	...youtubeCommands,
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
	handleYouTubeCommand,
};