const { SlashCommandBuilder } = require('discord.js');
const { loadMonitoredChannels, saveMonitoredChannels } = require('../utils/channelStorage');

// Channel monitoring commands
const channelCommands = [
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
];

// 處理 setchannel 指令
async function handleSetChannelCommand(interaction) {
	if (!interaction.member.permissions.has('Administrator')) {
		await interaction.reply({ content: '❌ Only administrators can use this command.', ephemeral: true });
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
		responseMessage = `✅ I have added monitoring for ${channel.name} for **${type === 'image' ? 'images' : 'text'}**.`;
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
			responseMessage = `✅ I have removed monitoring for ${channel.name} for **${type === 'image' ? 'images' : 'text'}**.`;
		}
		else {
			responseMessage = `⚠️ ${channel.name} was not set up for **${type === 'image' ? 'images' : 'text'}** monitoring.`;
		}
		break;
	}
	case 'clear': {
		saveMonitoredChannels({});
		responseMessage = '✅ I have cleared all monitoring channels.';
		break;
	}
	case 'list': {
		const channels = Object.keys(monitoredChannels);
		if (channels.length === 0) {
			responseMessage = '📋 I have not set up any monitoring channels.';
		}
		else {
			const channelList = [];
			for (const channelId of channels) {
				const monitoredTypes = monitoredChannels[channelId];
				const types = Object.keys(monitoredTypes).filter(t => monitoredTypes[t]);
				if (types.length === 0) continue;

				try {
					const ch = await interaction.client.channels.fetch(channelId);
					const typeNames = types.map(t => (t === 'image' ? 'images' : 'text')).join('、');
					channelList.push(`• ${ch.name} (${typeNames})`);
				}
				catch {
					const typeNames = types.map(t => (t === 'image' ? 'images' : 'text')).join('、');
					channelList.push(`• Unknown channel (${channelId}) (${typeNames})`);
				}
			}

			if (channelList.length === 0) {
				responseMessage = '📋 I have not set up any monitoring channels.';
			}
			else {
				responseMessage = `📋 I am currently monitoring these channels:\n${channelList.join('\n')}`;
			}
		}
		break;
	}
	}

	await interaction.editReply({ content: responseMessage });
}

module.exports = {
	channelCommands,
	handleSetChannelCommand,
};