const { Client, GatewayIntentBits, Partials, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

// 導入配置和工具模組
const { BOT_TOKEN, CLIENT_ID } = require('./config');
const { urlConversionService } = require('./services');
const { loadReactionRoles } = require('./utils/reactionRoleStorage');
const { commands, ...commandHandlers } = require('./commands');
const { loadSteamMonitoredChannels } = require('./utils/steamStorage');
const SteamService = require('./services/steam/steamService');

// 確保 Bot 有權限讀取訊息內容、訊息歷史、發送訊息、管理表情符號等
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		// 必須啟用，才能讀取訊息內容和附件
		GatewayIntentBits.GuildMessageReactions,
		// 監聽表情符號反應
		GatewayIntentBits.DirectMessages,
		// 允許 Bot 私訊使用者
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
	// 處理部分訊息、頻道、反應
});

// Steam service instance
const steamService = new SteamService();

client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);

	const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

	try {
		console.log('Started refreshing application (/) commands.');
		await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
		console.log('Successfully reloaded application (/) commands.');
	}
	catch (error) {
		console.error(error);
	}

	// Start Steam deals monitoring
	startSteamMonitoring();
});

// Steam monitoring function
async function checkSteamDeals() {
	try {
		const monitoredChannels = loadSteamMonitoredChannels();
		if (monitoredChannels.length === 0) {
			return;
		}

		const deals = await steamService.fetchCurrentDeals();
		if (deals.length === 0) {
			return;
		}

		console.log(`Broadcasting ${deals.length} current Steam deals`);
		const message = await steamService.createDealsMessage(deals);

		// Send to all monitored channels
		for (const channelId of monitoredChannels) {
			try {
				const channel = await client.channels.fetch(channelId);
				if (channel) {
					await channel.send(message);
				}
			}
			catch (error) {
				console.error(`Failed to send Steam deals to channel ${channelId}:`, error);
			}
		}
	}
	catch (error) {
		console.error('Error checking Steam deals:', error);
	}
}

function startSteamMonitoring() {
	const DAILY_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
	const TARGET_HOUR_UTC = 4;

	const now = new Date();
	const nextCheck = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TARGET_HOUR_UTC, 0, 0, 0));

	if (nextCheck.getTime() <= now.getTime()) {
		nextCheck.setUTCDate(nextCheck.getUTCDate() + 1);
	}

	const initialDelay = nextCheck.getTime() - now.getTime();

	console.log(`Starting Steam deals monitoring. Next check scheduled for ${nextCheck.toISOString()} (12:00 Asia/Taipei).`);

	setTimeout(() => {
		checkSteamDeals();
		setInterval(() => {
			checkSteamDeals();
		}, DAILY_CHECK_INTERVAL);
	}, initialDelay);
}

client.on('interactionCreate', async interaction => {
	try {
		await handleInteraction(interaction);
	}
	catch (error) {
		console.error(`Unhandled error in interactionCreate (${interaction.commandName}):`, error);
	}
});

async function handleInteraction(interaction) {
	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === 'reactmessage') {
			await commandHandlers.handleReactMessageCommand(interaction);
		}

		if (interaction.commandName === 'steam') {
			await commandHandlers.handleSteamCommand(interaction);
		}

		if (interaction.commandName === 'translate') {
			await commandHandlers.handleTranslateCommand(interaction);
		}

		if (interaction.commandName === 'ai-ranking') {
			await commandHandlers.handleAiRankingCommand(interaction);
		}
	}
	else if (interaction.isContextMenuCommand()) {
		if (interaction.commandName === '檢查圖片資訊') {
			await commandHandlers.handleViewImageInfoCommand(interaction);
		}
		else if (interaction.commandName === '收藏圖片') {
			await commandHandlers.handleFavoriteImageCommand(interaction);
		}
		else if (interaction.commandName === '刪除訊息') {
			await commandHandlers.handleDeleteMessageCommand(interaction);
		}
		else if (interaction.commandName === '移除機器人反應') {
			await commandHandlers.handleRemoveBotReactionsCommand(interaction);
		}
		else if (interaction.commandName === '轉換為GIF') {
			await commandHandlers.handleConvertToGifCommand(interaction);
		}
	}
}

client.on('messageReactionAdd', async (reaction, user) => {
	if (user.bot) return;

	// Fetch partials
	if (reaction.partial) {
		try { await reaction.fetch(); }
		catch (error) { console.error('Error fetching reaction:', error); return; }
	}
	if (reaction.message.partial) {
		try { await reaction.message.fetch(); }
		catch (error) { console.error('Error fetching message:', error); return; }
	}

	// Reaction Role Logic
	const reactionRoles = loadReactionRoles();
	const emojiId = reaction.emoji.id || reaction.emoji.name;
	const roleId = reactionRoles[reaction.message.id]?.[emojiId];

	if (roleId) {
		try {
			const member = await reaction.message.guild.members.fetch(user.id);
			await member.roles.add(roleId);
		}
		catch (error) {
			console.error(`Failed to add role ${roleId} to user ${user.id}:`, error);
		}
	}
});

client.on('messageReactionRemove', async (reaction, user) => {
	if (user.bot) return;

	if (reaction.partial) {
		try { await reaction.fetch(); }
		catch (error) { console.error('Error fetching reaction:', error); return; }
	}
	if (reaction.message.partial) {
		try { await reaction.message.fetch(); }
		catch (error) { console.error('Error fetching message:', error); return; }
	}

	const reactionRoles = loadReactionRoles();
	const emojiId = reaction.emoji.id || reaction.emoji.name;

	const roleId = reactionRoles[reaction.message.id]?.[emojiId];
	if (roleId) {
		try {
			const member = await reaction.message.guild.members.fetch(user.id);
			await member.roles.remove(roleId);
		}
		catch (error) {
			console.error(`Failed to remove role ${roleId} from user ${user.id}:`, error);
		}
	}
});

client.on('messageCreate', async message => {
	if (message.author.bot) return;

	// Handle URL conversions (Twitter, etc.)
	const hasUrlsToProcess = urlConversionService.hasUrlsToProcess(message.content);
	if (hasUrlsToProcess) {
		try {
			await message.suppressEmbeds(true);
			// console.log(`Fast suppressed embeds for message: ${message.id}`);
		}
		catch (error) {
			console.error('Failed to fast suppress embeds:', error);
		}
	}

	const conversionResults = await urlConversionService.processMessage(message.content);

	if (conversionResults.length > 0) {
		await urlConversionService.sendResults(conversionResults, message.channel, message);
	}
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
	if (newMessage.author?.bot) return;
	if (newMessage.embeds.length === 0) return;
	if ((newMessage.flags?.bitfield & 4) !== 0) return; // already SUPPRESS_EMBEDS

	if (!urlConversionService.hasUrlsToProcess(newMessage.content)) return;

	try {
		await newMessage.suppressEmbeds(true);
		// console.log(`Suppressed late embed for message: ${newMessage.id}`);
	}
	catch (error) {
		console.error('Failed to suppress late embed:', error);
	}
});

client.login(BOT_TOKEN);