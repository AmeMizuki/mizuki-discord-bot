const { SlashCommandBuilder } = require('discord.js');
const { loadReactionRoles, saveReactionRoles } = require('../utils/reactionRoleStorage');

// Reaction-related commands
const reactionCommands = [
	new SlashCommandBuilder()
		.setName('reactmessage')
		.setDescription('Manage reactions on messages (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add a reaction to a specific message, optionally with role assignment')
				.addStringOption(option =>
					option.setName('message_id')
						.setDescription('The ID of the message')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('emoji')
						.setDescription('The emoji to use for the reaction')
						.setRequired(true))
				.addRoleOption(option =>
					option.setName('role')
						.setDescription('The role to assign when users react (optional)')
						.setRequired(false)),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Remove a reaction from a specific message')
				.addStringOption(option =>
					option.setName('message_id')
						.setDescription('The ID of the message')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('emoji')
						.setDescription('The emoji to remove from the reaction')
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
		await interaction.reply({ content: '❌ Only administrators can use this command.', ephemeral: true });
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
			await interaction.editReply({ content: `❌ Message with ID \`${messageId}\` not found.` });
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
					await interaction.editReply({ content: '❌ Invalid emoji provided.' });
					return;
				}

				reactionRoles[targetMessage.id][emojiIdentifier] = role.id;
				saveReactionRoles(reactionRoles);

				await interaction.editReply({ content: `✅ Successfully added reaction ${emoji} to message [here](${targetMessage.url}) with role assignment. Users reacting with ${emoji} will get the \`${role.name}\` role.` });
			}
			else {
				await interaction.editReply({ content: `✅ Successfully added reaction ${emoji} to message [here](${targetMessage.url}).` });
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
				await interaction.editReply({ content: `✅ Successfully removed reaction ${emoji} from message [here](${targetMessage.url}).` });
			}
			else {
				await interaction.editReply({ content: `⚠️ No reaction ${emoji} found on this message, or the bot did not react to this emoji.` });
			}
		}

	}
	catch (error) {
		console.error('Error managing reaction:', error);
		if (error.code === 10014) {
			await interaction.editReply({ content: `❌ I cannot use the emoji \`${emoji}\`. It may be a custom emoji from a server I am not in.` });
		}
		else {
			await interaction.editReply({ content: '❌ An unexpected error occurred. Please check my permissions and try again.' });
		}
	}
}

module.exports = {
	reactionCommands,
	handleReactMessageCommand,
};