const { SlashCommandBuilder } = require('discord.js');
const { loadSteamMonitoredChannels, saveSteamMonitoredChannels } = require('../utils/steamStorage');
const SteamService = require('../services/steam/steamService');

// Steam monitoring commands
const steamCommands = [
	new SlashCommandBuilder()
		.setName('steam')
		.setDescription('Steam Deals Info (Admin only)')
		.addSubcommand(subcommand =>
			subcommand
				.setName('monitor')
				.setDescription('Start listening Steam Deals in this channel'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('unmonitor')
				.setDescription('Stop listening Steam Deals in this channel'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('List all channels listening Steam Deals'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('test')
				.setDescription('Test Steam Deals function, display current deals'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('clear')
				.setDescription('Clear all Steam Deals channels'),
		),
];

// Handle steam command
async function handleSteamCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ Only admins can use this command.', ephemeral: true });
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
			responseMessage = '⚠️ This channel is already listening to Steam Deals.';
		}
		else {
			monitoredChannels.push(channelId);
			saveSteamMonitoredChannels(monitoredChannels);
			responseMessage = `✅ Started listening to Steam Deals in ${interaction.channel.name}.`;
		}
		break;
	}
	case 'unmonitor': {
		const channelId = interaction.channel.id;
		const index = monitoredChannels.indexOf(channelId);
		if (index > -1) {
			monitoredChannels.splice(index, 1);
			saveSteamMonitoredChannels(monitoredChannels);
			responseMessage = `✅ Stopped listening to Steam Deals in ${interaction.channel.name}.`;
		}
		else {
			responseMessage = '⚠️ This channel is not listening to Steam Deals.';
		}
		break;
	}
	case 'clear': {
		saveSteamMonitoredChannels([]);
		responseMessage = '✅ Cleared all Steam Deals channels.';
		break;
	}
	case 'list': {
		if (monitoredChannels.length === 0) {
			responseMessage = '📋 No channels are listening to Steam Deals.';
		}
		else {
			const channelList = [];
			for (const channelId of monitoredChannels) {
				try {
					const channel = await interaction.client.channels.fetch(channelId);
					channelList.push(`• ${channel.name}`);
				}
				catch {
					channelList.push(`• Unknown channel (${channelId})`);
				}
			}
			responseMessage = `📋 Currently listening to Steam Deals channels:\n${channelList.join('\n')}`;
		}
		break;
	}
	case 'test': {
		try {
			const steamService = new SteamService();
			const deals = await steamService.fetchCurrentDeals();
			const message = await steamService.createDealsMessage(deals.slice(0, 3), 3);

			await interaction.editReply({ content: '🎮 **Steam Deals Test** - Here are the current deals:' });
			await interaction.followUp(message);
			return;
		}
		catch (error) {
			console.error('Error testing Steam deals:', error);
			responseMessage = '❌ Error testing Steam Deals.';
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