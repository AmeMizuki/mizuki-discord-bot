const { SlashCommandBuilder, ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');
const { getMetadata } = require('../utils/metadata');
const { createMetadataEmbed, createFavoriteImageEmbed } = require('../utils/embedBuilder');
const { loadMonitoredChannels, saveMonitoredChannels } = require('../utils/channelStorage');

// 建立指令定義
const commands = [
	new SlashCommandBuilder()
		.setName('finddata')
		.setDescription('查看圖片的資訊')
		.addAttachmentOption(option =>
			option.setName('image')
				.setDescription('請提供圖片')
				.setRequired(true),
		),
	new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('設定機器人監聽的頻道（僅管理員可用）')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('要監聽的頻道')
				.setRequired(true),
		)
		.addStringOption(option =>
			option.setName('action')
				.setDescription('操作類型')
				.setRequired(true)
				.addChoices(
					{ name: '添加頻道', value: 'add' },
					{ name: '移除頻道', value: 'remove' },
					{ name: '清空所有頻道', value: 'clear' },
					{ name: '查看當前頻道', value: 'list' },
				),
		),
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

	const channel = interaction.options.getChannel('channel');
	const action = interaction.options.getString('action');
	const monitoredChannels = loadMonitoredChannels();

	let responseMessage = '';

	switch (action) {
	case 'add': {
		if (!monitoredChannels.includes(channel.id)) {
			monitoredChannels.push(channel.id);
			saveMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 好的！我已經把 ${channel.name} 加到監聽清單裡了～以後有圖片我就會幫忙查看！`;
		}
		else {
			responseMessage = `⚠️ 咦？${channel.name} 已經在我的監聽清單裡了耶～`;
		}
		break;
	}

	case 'remove': {
		const index = monitoredChannels.indexOf(channel.id);
		if (index > -1) {
			monitoredChannels.splice(index, 1);
			saveMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 好的！我已經把 ${channel.name} 從監聽清單移除了～`;
		}
		else {
			responseMessage = `⚠️ 咦？${channel.name} 本來就不在我的監聽清單裡耶～`;
		}
		break;
	}

	case 'clear': {
		saveMonitoredChannels([]);
		responseMessage = '✅ 好的！我已經清空所有監聽頻道了～現在我不會自動監聽任何頻道的圖片，只有手動使用指令才會查看圖片資訊喔！';
		break;
	}

	case 'list': {
		if (monitoredChannels.length === 0) {
			responseMessage = '📋 目前我沒有設定任何監聽頻道，所以不會自動監聽圖片。你可以使用 /finddata 指令手動查看圖片資訊喔～';
		}
		else {
			const channelNames = [];
			for (const channelId of monitoredChannels) {
				try {
					const ch = await interaction.client.channels.fetch(channelId);
					channelNames.push(ch.name);
				}
				catch {
					channelNames.push(`未知頻道 (${channelId})`);
				}
			}
			responseMessage = `📋 目前我正在監聽這些頻道的圖片喔～\n${channelNames.map(name => `• ${name}`).join('\n')}`;
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

module.exports = {
	commands,
	handleFindDataCommand,
	handleSetChannelCommand,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
};