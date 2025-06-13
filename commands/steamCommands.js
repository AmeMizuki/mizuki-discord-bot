const { SlashCommandBuilder } = require('discord.js');
const { loadSteamMonitoredChannels, saveSteamMonitoredChannels } = require('../utils/steamStorage');
const SteamService = require('../services/steam/steamService');

// Steam monitoring commands
const steamCommands = [
	new SlashCommandBuilder()
		.setName('steam')
		.setDescription('Steam 特賣追蹤 (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('monitor')
				.setDescription('開始追蹤 Steam 特賣'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('unmonitor')
				.setDescription('停止追蹤 Steam 特賣'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('test')
				.setDescription('測試 Steam 特賣追蹤功能，顯示當前特賣'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('clear')
				.setDescription('清除所有 Steam 特賣追蹤頻道'),
		),
];

// Handle steam command
async function handleSteamCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const subcommand = interaction.options.getSubcommand();
	const monitoredChannels = loadSteamMonitoredChannels();
	let responseMessage = '';

	switch (subcommand) {
	case 'monitor': {
		const channelId = interaction.channel.id;
		if (monitoredChannels.includes(channelId)) {
			responseMessage = '⚠️ 此頻道已經在追蹤 Steam 特賣。';
		}
		else {
			monitoredChannels.push(channelId);
			saveSteamMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 開始追蹤 Steam 特賣於 ${interaction.channel.name}.`;
		}
		break;
	}
	case 'unmonitor': {
		const channelId = interaction.channel.id;
		const index = monitoredChannels.indexOf(channelId);
		if (index > -1) {
			monitoredChannels.splice(index, 1);
			saveSteamMonitoredChannels(monitoredChannels);
			responseMessage = `✅ 停止追蹤 Steam 特賣於 ${interaction.channel.name}.`;
		}
		else {
			responseMessage = '⚠️ 此頻道未在追蹤 Steam 特賣。';
		}
		break;
	}
	case 'clear': {
		saveSteamMonitoredChannels([]);
		responseMessage = '✅ 清除所有 Steam 特賣追蹤頻道。';
		break;
	}
	case 'test': {
		try {
			const steamService = new SteamService();
			const deals = await steamService.fetchCurrentDeals();
			const message = await steamService.createDealsMessage(deals.slice(0, 3), 3);

			await interaction.editReply({ content: '🎮 **Steam 特賣測試** - 以下是當前特賣：' });
			await interaction.followUp(message);
			return;
		}
		catch (error) {
			console.error('Steam 特賣測試錯誤:', error);
			responseMessage = '❌ 測試 Steam 特賣時發生錯誤。';
		}
		break;
	}
	}

	await interaction.editReply({ content: responseMessage });
}

module.exports = {
	steamCommands,
	handleSteamCommand,
};