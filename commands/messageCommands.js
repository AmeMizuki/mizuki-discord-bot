const { ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');

// Message management commands
const messageCommands = [
	new ContextMenuCommandBuilder()
		.setName('Delete Message')
		.setType(ApplicationCommandType.Message),
	new ContextMenuCommandBuilder()
		.setName('Remove Bot Reactions')
		.setType(ApplicationCommandType.Message),
];

// Handle the "Delete Message" context menu command
async function handleDeleteMessageCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;

	// Check if the message was sent by the bot
	if (!message.author.bot || message.author.id !== interaction.client.user.id) {
		await interaction.editReply({ content: '❌ I can only delete my own messages.', ephemeral: true });
		return;
	}

	// Check if the user has permission to delete the message
	// Allow if user is admin or if user was the original requester of the URL conversion
	const isAdmin = interaction.member.permissions.has('Administrator');

	// Use the UrlConversionService to check if user can delete
	const { UrlConversionService } = require('../services');
	const urlConversionService = new UrlConversionService();
	const canDeleteViaService = urlConversionService.canUserDeleteMessage(message.id, interaction.user.id);

	// Fallback to the old method if service doesn't have the relation
	const canDeleteFallback = !canDeleteViaService && await checkIfUserCanDeleteMessage(message, interaction.user.id);

	const canDelete = isAdmin || canDeleteViaService || canDeleteFallback;

	if (!canDelete) {
		await interaction.editReply({ content: '❌ You do not have permission to delete this message. Only administrators or the original sender can delete.', ephemeral: true });
		return;
	}

	try {
		await message.delete();
		await interaction.editReply({ content: '✅ Message deleted successfully!', ephemeral: true });
	}
	catch (error) {
		console.error('Failed to delete message:', error);
		await interaction.editReply({ content: '❌ Failed to delete message. This may be due to insufficient permissions or the message has already been deleted.', ephemeral: true });
	}
}

// Handle the "Remove Bot Reactions" context menu command
async function handleRemoveBotReactionsCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;

	// Check if the user is the author of the message or an admin
	const isMessageAuthor = message.author.id === interaction.user.id;
	const isAdmin = interaction.member.permissions.has('Administrator');

	if (!isMessageAuthor && !isAdmin) {
		await interaction.editReply({ content: '❌ You can only remove reactions from your own messages, or you need administrator permissions.', ephemeral: true });
		return;
	}

	try {
		let removedCount = 0;
		const botId = interaction.client.user.id;

		// Get all reactions on the message
		const reactions = message.reactions.cache;

		for (const [, reaction] of reactions) {
			// Check if the bot has reacted with this emoji
			const users = await reaction.users.fetch();
			if (users.has(botId)) {
				try {
					await reaction.users.remove(botId);
					removedCount++;
				}
				catch (error) {
					console.error(`Failed to remove reaction ${reaction.emoji.name}:`, error);
				}
			}
		}

		if (removedCount > 0) {
			await interaction.editReply({ content: `✅ Successfully removed ${removedCount} bot reactions!`, ephemeral: true });
		}
		else {
			await interaction.editReply({ content: '🤔 No bot reactions found on this message.', ephemeral: true });
		}
	}
	catch (error) {
		console.error('Failed to remove bot reactions:', error);
		await interaction.editReply({ content: '❌ Failed to remove bot reactions. This may be due to insufficient permissions.', ephemeral: true });
	}
}

// Helper function to check if user can delete the message
async function checkIfUserCanDeleteMessage(botMessage, userId) {
	try {
		const messages = await botMessage.channel.messages.fetch({
			before: botMessage.id,
			limit: 10,
		});

		// Find the most recent message from the user that contains URLs
		for (const [, msg] of messages) {
			if (msg.author.id === userId && containsUrls(msg.content)) {
				return true;
			}
		}
	}
	catch (error) {
		console.error('Error checking message permissions:', error);
	}

	return false;
}

// Helper function to check if content contains URLs
function containsUrls(content) {
	const urlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/gi;
	return urlRegex.test(content);
}

module.exports = {
	messageCommands,
	handleDeleteMessageCommand,
	handleRemoveBotReactionsCommand,
};