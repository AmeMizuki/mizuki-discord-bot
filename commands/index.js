const { SlashCommandBuilder } = require('discord.js');
const { getMetadata } = require('../utils/metadata');
const { createMetadataEmbed } = require('../utils/embedBuilder');
const { MONITORED_CHANNELS } = require('../config');

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
	// 檢查用戶是否有管理員權限
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ 只有管理員才能使用這個指令喔～', ephemeral: true });
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const channel = interaction.options.getChannel('channel');
	const action = interaction.options.getString('action');

	let responseMessage = '';

	switch (action) {
	case 'add': {
		if (!MONITORED_CHANNELS.includes(channel.id)) {
			MONITORED_CHANNELS.push(channel.id);
			responseMessage = `✅ 好的！我已經把 ${channel.name} 加到監聽清單裡了～以後有圖片我就會幫忙查看！`;
		}
		else {
			responseMessage = `⚠️ 咦？${channel.name} 已經在我的監聽清單裡了耶～`;
		}
		break;
	}

	case 'remove': {
		const index = MONITORED_CHANNELS.indexOf(channel.id);
		if (index > -1) {
			MONITORED_CHANNELS.splice(index, 1);
			responseMessage = `✅ 好的！我已經把 ${channel.name} 從監聽清單移除了～`;
		}
		else {
			responseMessage = `⚠️ 咦？${channel.name} 本來就不在我的監聽清單裡耶～`;
		}
		break;
	}

	case 'clear': {
		MONITORED_CHANNELS.length = 0;
		responseMessage = '✅ 好的！我已經清空所有監聽頻道了～現在我會監聽所有頻道的圖片喔！';
		break;
	}

	case 'list': {
		if (MONITORED_CHANNELS.length === 0) {
			responseMessage = '📋 目前我沒有設定特定的監聽頻道，所以會監聽所有頻道的圖片喔～';
		}
		else {
			const channelNames = [];
			for (const channelId of MONITORED_CHANNELS) {
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

module.exports = {
	commands,
	handleFindDataCommand,
	handleSetChannelCommand,
};