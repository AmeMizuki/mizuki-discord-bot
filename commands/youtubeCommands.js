const { SlashCommandBuilder } = require('discord.js');
const { loadYouTubeMonitoredChannels, saveYouTubeMonitoredChannels } = require('../utils/youtubeStorage');

function isValidYouTubeChannelId(id) {
	return typeof id === 'string' && id.length === 24 && id.startsWith('UC');
}

const youtubeCommands = [
	new SlashCommandBuilder()
		.setName('youtube')
		.setDescription('YouTube 頻道追蹤 (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('追蹤一個 YouTube 頻道的新影片和直播通知')
				.addStringOption(option =>
					option.setName('channel_id')
						.setDescription('YouTube 頻道 ID')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('停止追蹤一個 YouTube 頻道')
				.addStringOption(option =>
					option.setName('channel_id')
						.setDescription('要停止追蹤的 YouTube 頻道 ID')
						.setRequired(true))),
];

async function handleYouTubeCommand(interaction) {
	if (!interaction.isChatInputCommand()) return;

	let responseMessage = 'Something went wrong.';
	const subcommand = interaction.options.getSubcommand();
	const guildId = interaction.guildId;
	const channelId = interaction.channelId;

	let monitoredChannels = loadYouTubeMonitoredChannels();

	switch (subcommand) {
	case 'add': {
		const youtubeChannelId = interaction.options.getString('channel_id');
		if (!isValidYouTubeChannelId(youtubeChannelId)) {
			responseMessage = '⚠️ 無效的 YouTube 頻道 ID。請確認 ID 格式是否正確。';
			break;
		}

		// Check if already tracking in this guild/channel
		const existingEntry = monitoredChannels.find(entry =>
			entry.guildId === guildId &&
			entry.channelId === channelId &&
			entry.youtubeChannelId === youtubeChannelId,
		);

		if (existingEntry) {
			responseMessage = `⚠️ 此頻道已經在追蹤 YouTube 頻道 ID：${youtubeChannelId}。`;
		}
		else {
			monitoredChannels.push({
				guildId,
				channelId,
				youtubeChannelId,
				lastVideoId: null,
				lastLiveStreamId: null,
			});
			saveYouTubeMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 已開始追蹤 YouTube 頻道 ID：${youtubeChannelId} 於 ${interaction.channel.name}.`;
		}
		break;
	}
	case 'remove': {
		const youtubeChannelId = interaction.options.getString('channel_id');
		const initialLength = monitoredChannels.length;
		monitoredChannels = monitoredChannels.filter(entry =>
			!(entry.guildId === guildId &&
			entry.channelId === channelId &&
			entry.youtubeChannelId === youtubeChannelId),
		);
		if (monitoredChannels.length < initialLength) {
			saveYouTubeMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 已停止追蹤 YouTube 頻道 ID：${youtubeChannelId} 於 ${interaction.channel.name}.`;
		}
		else {
			responseMessage = `⚠️ 此頻道未在追蹤 YouTube 頻道 ID：${youtubeChannelId}。`;
		}
		break;
	}
	default:
		responseMessage = '未知指令。';
	}

	await interaction.reply({ content: responseMessage, ephemeral: true });
}

module.exports = {
	youtubeCommands,
	handleYouTubeCommand,
};