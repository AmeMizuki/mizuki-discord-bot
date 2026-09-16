const { ApplicationCommandType, ContextMenuCommandBuilder, ChannelType } = require('discord.js');
const { urlConversionService } = require('../services');

// Message management commands
const messageCommands = [
	new ContextMenuCommandBuilder()
		.setName('刪除訊息')
		.setType(ApplicationCommandType.Message),
	new ContextMenuCommandBuilder()
		.setName('移除機器人反應')
		.setType(ApplicationCommandType.Message),
];

// Handle the "Delete Message" context menu command
async function handleDeleteMessageCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;

	// Check if the message was sent by the bot
	if (!message.author.bot || message.author.id !== interaction.client.user.id) {
		await interaction.editReply({ content: '❌ 我只能刪除自己的訊息。', ephemeral: true });
		return;
	}

	// If in a DM channel and it's the bot's message, allow deletion directly
	if (interaction.channel.type === ChannelType.DM) {
		try {
			await message.delete();
			await interaction.editReply({ content: '✅ 訊息已成功刪除！', ephemeral: true });
		}
		catch (error) {
			console.error('Failed to delete DM message:', error);
			await interaction.editReply({ content: '❌ 無法刪除 DM 訊息。這可能是由於權限不足或訊息已刪除。', ephemeral: true });
		}
		return;
	}

	// Check if the user has permission to delete the message
	// Allow if user is admin or if user was the original requester of the URL conversion
	const isAdmin = interaction.member ? interaction.member.permissions.has('Administrator') : false;

	// Use the shared UrlConversionService instance to check if user can delete
	const canDeleteViaService = urlConversionService.canUserDeleteMessage(message.id, interaction.user.id);

	// Fallback to the old method if service doesn't have the relation
	const canDeleteFallback = !canDeleteViaService && await checkIfUserCanDeleteMessage(message, interaction.user.id);

	const canDelete = isAdmin || canDeleteViaService || canDeleteFallback;

	if (!canDelete) {
		await interaction.editReply({ content: '❌ 您沒有權限刪除此訊息。只有管理員或原始發送者可以刪除。', ephemeral: true });
		return;
	}

	try {
		await message.delete();
		await interaction.editReply({ content: '✅ 訊息已成功刪除！', ephemeral: true });
	}
	catch (error) {
		console.error('Failed to delete message:', error);
		await interaction.editReply({ content: '❌ 無法刪除訊息。這可能是由於權限不足或訊息已刪除。', ephemeral: true });
	}
}

// Handle the "Remove Bot Reactions" context menu command
async function handleRemoveBotReactionsCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;

	// Check if the user is the author of the message or an admin
	const isMessageAuthor = message.author.id === interaction.user.id;
	const isAdmin = interaction.member ? interaction.member.permissions.has('Administrator') : false;

	if (!isMessageAuthor && !isAdmin) {
		await interaction.editReply({ content: '❌ 您只能移除自己的訊息上的反應，或您需要管理員權限。', ephemeral: true });
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
			await interaction.editReply({ content: `✅ 成功移除 ${removedCount} 個機器人反應！`, ephemeral: true });
		}
		else {
			await interaction.editReply({ content: '🤔 此訊息上沒有機器人反應。', ephemeral: true });
		}
	}
	catch (error) {
		console.error('Failed to remove bot reactions:', error);
		await interaction.editReply({ content: '❌ 無法移除機器人反應。這可能是由於權限不足。', ephemeral: true });
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