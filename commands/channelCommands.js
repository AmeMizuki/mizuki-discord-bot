const { SlashCommandBuilder } = require('discord.js');
const { loadMonitoredChannels, saveMonitoredChannels } = require('../utils/channelStorage');

// Image monitoring commands
const channelCommands = [
	new SlashCommandBuilder()
		.setName('setimage')
		.setDescription('設定圖片檢閱功能 (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('在指定頻道開始檢閱圖片')
				.addChannelOption(option => option.setName('channel').setDescription('要檢閱的頻道').setRequired(true)),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('停止在指定頻道檢閱圖片')
				.addChannelOption(option => option.setName('channel').setDescription('要停止檢閱的頻道').setRequired(true)),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('clear')
				.setDescription('清除所有檢閱圖片的頻道'),
		),
];

// Handle setimage command
async function handleSetImageCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const subcommand = interaction.options.getSubcommand();
	const monitoredChannels = loadMonitoredChannels();
	let responseMessage = '';

	switch (subcommand) {
	case 'add': {
		const channel = interaction.options.getChannel('channel');

		if (!monitoredChannels[channel.id]) {
			monitoredChannels[channel.id] = { image: false, text: false };
		}

		if (monitoredChannels[channel.id].image) {
			responseMessage = `⚠️ ${channel.name} 已經在檢閱圖片了。`;
		}
		else {
			monitoredChannels[channel.id].image = true;
			saveMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 已開始在 ${channel.name} 檢閱圖片。`;
		}
		break;
	}
	case 'remove': {
		const channel = interaction.options.getChannel('channel');

		if (monitoredChannels[channel.id] && monitoredChannels[channel.id].image) {
			monitoredChannels[channel.id].image = false;
			// If no more monitoring types are active for this channel, remove the channel entry
			if (Object.values(monitoredChannels[channel.id]).every(v => !v)) {
				delete monitoredChannels[channel.id];
			}
			saveMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 已停止在 ${channel.name} 檢閱圖片。`;
		}
		else {
			responseMessage = `⚠️ ${channel.name} 沒有在檢閱圖片。`;
		}
		break;
	}
	case 'clear': {
		// Only clear image monitoring, keep text monitoring if any
		const updatedChannels = {};
		for (const [channelId, config] of Object.entries(monitoredChannels)) {
			if (config.text) {
				updatedChannels[channelId] = { image: false, text: true };
			}
		}
		saveMonitoredChannels(updatedChannels);
		responseMessage = '✅ 已清除所有檢閱圖片的頻道。';
		break;
	}
	}

	await interaction.editReply({ content: responseMessage });
}

module.exports = {
	channelCommands,
	handleSetImageCommand,
};