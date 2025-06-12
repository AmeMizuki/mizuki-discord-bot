const { SlashCommandBuilder, ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');
const { getMetadata } = require('../utils/metadata');
const { createMetadataEmbed, createFavoriteImageEmbed } = require('../utils/embedBuilder');
const { loadMonitoredChannels, saveMonitoredChannels } = require('../utils/channelStorage');
const { loadReactionRoles, saveReactionRoles } = require('../utils/reactionRoleStorage');

// 建立指令定義
const commands = [
	new SlashCommandBuilder()
		.setName('finddata')
		.setDescription('Check information of an image')
		.addAttachmentOption(option =>
			option.setName('image')
				.setDescription('The image to check')
				.setRequired(true),
		),
	new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('Set up channel monitoring (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add a channel to monitor')
				.addChannelOption(option => option.setName('channel').setDescription('The channel to monitor').setRequired(true))
				.addStringOption(option => option.setName('type').setDescription('The type of content to monitor').setRequired(true)
					.addChoices(
						{ name: 'Image', value: 'image' },
						{ name: 'Text', value: 'text' },
					),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove a channel from monitoring')
				.addChannelOption(option => option.setName('channel').setDescription('The channel to remove').setRequired(true))
				.addStringOption(option => option.setName('type').setDescription('The type of content to monitor').setRequired(true)
					.addChoices(
						{ name: 'Image', value: 'image' },
						{ name: 'Text', value: 'text' },
					),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('List all monitored channels'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('clear')
				.setDescription('Clear all monitored channels'),
		),
	new SlashCommandBuilder()
		.setName('reactmessage')
		.setDescription('Add a reaction to a specific message, optionally with role assignment (Admin only).')
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
	new ContextMenuCommandBuilder()
		.setName('Check Image Info')
		.setType(ApplicationCommandType.Message),
	new ContextMenuCommandBuilder()
		.setName('Favorite Image')
		.setType(ApplicationCommandType.Message),
].map(command => command.toJSON());

// 處理 finddata 指令
async function handleFindDataCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const imageAttachment = interaction.options.getAttachment('image');

	if (!imageAttachment || !imageAttachment.contentType.startsWith('image/')) {
		await interaction.editReply({ content: '請提供一個有效的圖片檔案喔～', ephemeral: true });
		return;
	}

	const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);
	const embed = await createMetadataEmbed(metadata, interaction.user, imageAttachment.url);

	await interaction.editReply({
		embeds: [embed],
		ephemeral: true,
	});
}

// 處理 setchannel 指令
async function handleSetChannelCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ 只有管理員才能使用這個指令喔～', ephemeral: true });
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const subcommand = interaction.options.getSubcommand();
	const monitoredChannels = loadMonitoredChannels();
	let responseMessage = '';

	switch (subcommand) {
	case 'add': {
		const channel = interaction.options.getChannel('channel');
		const type = interaction.options.getString('type');

		if (!monitoredChannels[channel.id]) {
			monitoredChannels[channel.id] = { image: false, text: false };
		}
		monitoredChannels[channel.id][type] = true;
		saveMonitoredChannels(monitoredChannels);
		responseMessage = `✅ 好的！我已經把 ${channel.name} 的 **${type === 'image' ? '圖片' : '文字'}** 監聽加入了～`;
		break;
	}
	case 'remove': {
		const channel = interaction.options.getChannel('channel');
		const type = interaction.options.getString('type');

		if (monitoredChannels[channel.id] && monitoredChannels[channel.id][type]) {
			monitoredChannels[channel.id][type] = false;
			// If no more monitoring types are active for this channel, remove the channel entry.
			if (Object.values(monitoredChannels[channel.id]).every(v => !v)) {
				delete monitoredChannels[channel.id];
			}
			saveMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 好的！我已經把 ${channel.name} 的 **${type === 'image' ? '圖片' : '文字'}** 監聽移除了～`;
		}
		else {
			responseMessage = `⚠️ 咦？${channel.name} 本來就沒有設定 **${type === 'image' ? '圖片' : '文字'}** 監聽耶～`;
		}
		break;
	}
	case 'clear': {
		saveMonitoredChannels({});
		responseMessage = '✅ 好的！我已經清空所有監聽頻道了～';
		break;
	}
	case 'list': {
		const channels = Object.keys(monitoredChannels);
		if (channels.length === 0) {
			responseMessage = '📋 目前我沒有設定任何監聽頻道。';
		}
		else {
			const channelList = [];
			for (const channelId of channels) {
				const monitoredTypes = monitoredChannels[channelId];
				const types = Object.keys(monitoredTypes).filter(t => monitoredTypes[t]);
				if (types.length === 0) continue;

				try {
					const ch = await interaction.client.channels.fetch(channelId);
					const typeNames = types.map(t => (t === 'image' ? '圖片' : '文字')).join('、');
					channelList.push(`• ${ch.name} (${typeNames})`);
				}
				catch {
					const typeNames = types.map(t => (t === 'image' ? '圖片' : '文字')).join('、');
					channelList.push(`• 未知頻道 (${channelId}) (${typeNames})`);
				}
			}

			if (channelList.length === 0) {
				responseMessage = '📋 目前我沒有設定任何監聽頻道。';
			}
			else {
				responseMessage = `📋 目前我正在監聽這些頻道喔～\n${channelList.join('\n')}`;
			}
		}
		break;
	}
	}

	await interaction.editReply({ content: responseMessage });
}

// 處理 View Image Info 指令
async function handleViewImageInfoCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));

	if (imageAttachments.size === 0) {
		await interaction.editReply({ content: '❌ 這條訊息沒有圖片附件喔～', ephemeral: true });
		return;
	}

	for (const imageAttachment of imageAttachments.values()) {
		const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);
		const embed = await createMetadataEmbed(metadata, interaction.user, imageAttachment.url);
		await interaction.user.send({ embeds: [embed] });
	}

	await interaction.editReply({ content: '✅ 已私訊所有圖片的資訊給你囉！', ephemeral: true });
}

// Handle the new "Favorite Image" context menu command
async function handleFavoriteImageCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));

	if (imageAttachments.size === 0) {
		await interaction.editReply({ content: '❌ 這條訊息沒有圖片附件喔～我沒辦法收藏耶！', ephemeral: true });
		return;
	}

	for (const imageAttachment of imageAttachments.values()) {
		try {
			const favoriteEmbed = await createFavoriteImageEmbed(imageAttachment.url, message.url, interaction.user);
			await interaction.user.send({ embeds: [favoriteEmbed] });
		}
		catch (error) {
			console.error('Failed to send favorite image via context menu to user:', error);
			await interaction.user.send({ content: `收藏失敗，可能無法私訊給你。請檢查你的隱私設定或再試一次。圖片連結：${imageAttachment.url}`, ephemeral: true });
		}
	}

	await interaction.editReply({ content: '✅ 所有圖片已收藏並私訊給你囉！', ephemeral: true });
}

// Helper to get a consistent emoji identifier
function getEmojiIdentifier(emoji) {
	// For custom emojis, the format is <:name:id> or <a:name:id> for animated
	const customEmoji = emoji.match(/<a?:(\w+):(\d+)>/);
	if (customEmoji) {
		return customEmoji[2];
		// Use the ID for custom emojis
	}
	// For standard emojis, just use the emoji itself
	return emoji;
}

async function handleReactMessageCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ Only administrators can use this command.', ephemeral: true });
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const messageId = interaction.options.getString('message_id');
	const emoji = interaction.options.getString('emoji');
	const role = interaction.options.getRole('role');

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
					// Message not in this channel, continue searching
				}
			}
		}

		if (!targetMessage) {
			await interaction.editReply({ content: `❌ Could not find a message with ID \`${messageId}\` in this server.` });
			return;
		}

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
	catch (error) {
		console.error('Error adding reaction:', error);
		if (error.code === 10014) {
			await interaction.editReply({ content: `❌ I cannot use the emoji \`${emoji}\`. It might be a custom emoji from a server I'm not in.` });
		}
		else {
			await interaction.editReply({ content: '❌ An unexpected error occurred. Please check my permissions and try again.' });
		}
	}
}

module.exports = {
	commands,
	handleFindDataCommand,
	handleSetChannelCommand,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
	handleReactMessageCommand,
};