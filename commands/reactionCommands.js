const { SlashCommandBuilder } = require('discord.js');
const { loadReactionRoles, saveReactionRoles } = require('../utils/reactionRoleStorage');

// Reaction-related commands
const reactionCommands = [
	new SlashCommandBuilder()
		.setName('reactmessage')
		.setDescription('管理訊息上的反應 (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('在指定訊息上新增反應，可選擇分配角色')
				.addStringOption(option =>
					option.setName('message_id')
						.setDescription('訊息的 ID')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('emoji')
						.setDescription('要使用的表情符號')
						.setRequired(true))
				.addRoleOption(option =>
					option.setName('role')
						.setDescription('要分配的身分組 (可選)')
						.setRequired(false)),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('從指定訊息上移除反應')
				.addStringOption(option =>
					option.setName('message_id')
						.setDescription('訊息的 ID')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('emoji')
						.setDescription('要移除的表情符號')
						.setRequired(true)),
		),
];

// Helper to get a consistent emoji identifier
function getEmojiIdentifier(emoji) {
	// For custom emojis, the format is <:name:id> or <a:name:id> for animated
	const customEmoji = emoji.match(/<a?:(\w+):(\d+)>/);
	if (customEmoji) {
		return customEmoji[2];
	}
	return emoji;
}

async function handleReactMessageCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const subcommand = interaction.options.getSubcommand();
	const messageId = interaction.options.getString('message_id');
	const emoji = interaction.options.getString('emoji');

	let targetMessage;
	try {
		const channels = await interaction.guild.channels.fetch();
		for (const channel of channels.values()) {
			if (channel.isTextBased()) {
				try {
					targetMessage = await channel.messages.fetch(messageId);
					if (targetMessage) break;
				}
				catch {
					continue;
				}
			}
		}

		if (!targetMessage) {
			await interaction.editReply({ content: `❌ 找不到 ID 為 \`${messageId}\` 的訊息。` });
			return;
		}

		if (subcommand === 'add') {
			const role = interaction.options.getRole('role');

			// Add the reaction to the message
			await targetMessage.react(emoji);

			// If a role is provided, set up reaction role
			if (role) {
				const reactionRoles = loadReactionRoles();
				if (!reactionRoles[targetMessage.id]) {
					reactionRoles[targetMessage.id] = {};
				}

				const emojiIdentifier = getEmojiIdentifier(emoji);
				if (!emojiIdentifier) {
					await interaction.editReply({ content: '❌ 無效的表情符號。' });
					return;
				}

				reactionRoles[targetMessage.id][emojiIdentifier] = role.id;
				saveReactionRoles(reactionRoles);

				await interaction.editReply({ content: `✅ 成功在訊息 [這裡](${targetMessage.url}) 上新增反應 ${emoji}，並分配角色。使用 ${emoji} 反應的使用者將獲得 \`${role.name}\` 身分組。` });
			}
			else {
				await interaction.editReply({ content: `✅ 成功在訊息 [這裡](${targetMessage.url}) 上新增反應 ${emoji}。` });
			}
		}
		else if (subcommand === 'delete') {
			// Remove the bot's reaction
			const reactions = targetMessage.reactions.cache;
			let removed = false;

			for (const [, reaction] of reactions) {
				// Check if this is the emoji we want to remove
				const reactionEmoji = reaction.emoji.id || reaction.emoji.name;
				const targetEmojiId = getEmojiIdentifier(emoji);

				if (reactionEmoji === targetEmojiId || reaction.emoji.name === emoji) {
					try {
						await reaction.users.remove(interaction.client.user.id);
						removed = true;

						// Also remove from reaction roles if it exists
						const reactionRoles = loadReactionRoles();
						if (reactionRoles[targetMessage.id] && reactionRoles[targetMessage.id][targetEmojiId]) {
							delete reactionRoles[targetMessage.id][targetEmojiId];

							// Clean up empty message entries
							if (Object.keys(reactionRoles[targetMessage.id]).length === 0) {
								delete reactionRoles[targetMessage.id];
							}

							saveReactionRoles(reactionRoles);
						}
						break;
					}
					catch (error) {
						console.error(`Failed to remove reaction ${emoji}:`, error);
					}
				}
			}

			if (removed) {
				await interaction.editReply({ content: `✅ 成功從訊息 [這裡](${targetMessage.url}) 上移除反應 ${emoji}。` });
			}
			else {
				await interaction.editReply({ content: `⚠️ 找不到訊息 [這裡](${targetMessage.url}) 上的反應 ${emoji}，或機器人未反應此表情符號。` });
			}
		}

	}
	catch (error) {
		console.error('Error managing reaction:', error);
		if (error.code === 10014) {
			await interaction.editReply({ content: `❌ 我無法使用表情符號 \`${emoji}\`。它可能是來自我不在的伺服器的自定義表情符號。` });
		}
		else {
			await interaction.editReply({ content: '❌ 發生意外錯誤。請檢查我的權限並重試。' });
		}
	}
}

module.exports = {
	reactionCommands,
	handleReactMessageCommand,
};