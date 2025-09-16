const { Client, GatewayIntentBits, Partials, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

// 導入配置和工具模組
const { BOT_TOKEN, CLIENT_ID, MONITORED_CHANNELS } = require('./config');
const { getMetadata } = require('./utils/metadata');
const { sendMetadataReply, createFavoriteImageEmbed } = require('./utils/embedBuilder');
const { UrlConversionService } = require('./services');
const { loadReactionRoles } = require('./utils/reactionRoleStorage');
const { commands, ...commandHandlers } = require('./commands');
const { loadSteamMonitoredChannels } = require('./utils/steamStorage');
const SteamService = require('./services/steam/steamService');
const { loadYouTubeMonitoredChannels, saveYouTubeMonitoredChannels } = require('./utils/youtubeStorage');
const YouTubeService = require('./services/youtube/youtubeService');

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

// YouTube service instance
const youtubeService = new YouTubeService();

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

	// Start YouTube monitoring
	startYouTubeMonitoring();
});

// Steam monitoring function
async function checkSteamDeals() {
	try {
		const monitoredChannels = loadSteamMonitoredChannels();
		if (monitoredChannels.length === 0) {
			return;
		}

		const newDeals = await steamService.getNewDeals();
		if (newDeals.length === 0) {
			return;
		}

		console.log(`Found ${newDeals.length} new Steam deals`);
		const message = await steamService.createDealsMessage(newDeals);

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
	const now = new Date();
	const targetHour = 5;

	let initialDelay = 0;
	const nextCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, 0, 0, 0);

	if (now.getHours() >= targetHour) {
		nextCheck.setDate(nextCheck.getDate() + 1);
	}

	initialDelay = nextCheck.getTime() - now.getTime();

	console.log(`Starting Steam deals monitoring. Next check scheduled for ${nextCheck.toLocaleString()}.`);

	setTimeout(() => {
		checkSteamDeals();
		setInterval(() => {
			checkSteamDeals();
		}, DAILY_CHECK_INTERVAL);
	}, initialDelay);
}

// YouTube monitoring function
async function checkYouTubeVideos() {
	try {
		let monitoredChannels = loadYouTubeMonitoredChannels();
		if (monitoredChannels.length === 0) {
			return;
		}

		for (const entry of monitoredChannels) {
			const { channelId, youtubeChannelId, lastVideoId } = entry;
			const channel = await client.channels.fetch(channelId).catch(console.error);

			if (!channel) {
				console.warn(`YouTube monitoring: Channel ${channelId} not found, removing from list.`);
				monitoredChannels = monitoredChannels.filter(c => c.channelId !== channelId);
				saveYouTubeMonitoredChannels(monitoredChannels);
				continue;
			}

			const latestVideo = await youtubeService.fetchLatestVideo(youtubeChannelId);

			if (latestVideo) {
				if (latestVideo.id !== lastVideoId) {
					await channel.send(`新影片上傳囉！ ${latestVideo.author}: ${latestVideo.link}`).catch(console.error);
					console.log(`Sent new YouTube video for ${youtubeChannelId} to ${channel.name}`);

					entry.lastVideoId = latestVideo.id;
					saveYouTubeMonitoredChannels(monitoredChannels);
				}
			}
		}
	}
	catch (error) {
		console.error('Error checking YouTube videos:', error);
	}
}

function startYouTubeMonitoring() {
	const YOUTUBE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
	console.log(`Starting YouTube monitoring. Checking every ${YOUTUBE_CHECK_INTERVAL / (60 * 60 * 1000)} hours.`);

	checkYouTubeVideos();

	setInterval(checkYouTubeVideos, YOUTUBE_CHECK_INTERVAL);
}

client.on('interactionCreate', async interaction => {
	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === 'setimage') {
			await commandHandlers.handleSetImageCommand(interaction);
		}

		if (interaction.commandName === 'reactmessage') {
			await commandHandlers.handleReactMessageCommand(interaction);
		}

		if (interaction.commandName === 'steam') {
			await commandHandlers.handleSteamCommand(interaction);
		}

		if (interaction.commandName === 'youtube') {
			await commandHandlers.handleYouTubeCommand(interaction);
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
	}
});

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

	// Logic for 🔍 and ❤️ reactions
	if (reaction.emoji.name === '🔍' || reaction.emoji.name === '❤️') {
		const message = reaction.message;
		const imageAttachments = message.attachments.filter(att => att.contentType && att.contentType.startsWith('image/'));

		if (imageAttachments.size > 0) {
			for (const imageAttachment of imageAttachments.values()) {
				try {
					if (reaction.emoji.name === '🔍') {
						// Removed prompt message
					}
					else if (reaction.emoji.name === '❤️') {
						// Removed prompt message
					}
				}
				catch (error) {
					console.warn(`Could not DM user ${user.tag}. They might have DMs disabled or bot is blocked. Error:`, error);
				}

				const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);

				if (reaction.emoji.name === '❤️') {
					try {
						const favoriteEmbed = await createFavoriteImageEmbed(imageAttachment.url, message.url, user);
						await user.send({ embeds: [favoriteEmbed] });
					}
					catch (error) {
						console.error('Failed to send favorite image to user:', error);
					}
				}
				else {
					await sendMetadataReply(message.channel, user.id, metadata, null, imageAttachment.url, message.author);
				}
			}
		}
		else {
			try {
				await user.send('This message has no image attachments. I cannot extract information.');
			}
			catch (error) {
				console.warn(`Could not DM user ${user.tag}. Error:`, error);
			}
		}
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
	const urlConversionService = new UrlConversionService();
	const hasUrlsToProcess = urlConversionService.hasUrlsToProcess(message.content);
	if (hasUrlsToProcess) {
		try {
			await message.suppressEmbeds(true);
			console.log(`Fast suppressed embeds for message: ${message.id}`);
		}
		catch (error) {
			console.error('Failed to fast suppress embeds:', error);
		}
	}

	const conversionResults = await urlConversionService.processMessage(message.content);

	if (conversionResults.length > 0) {
		await urlConversionService.sendResults(conversionResults, message.channel, message);
	}

	const monitoredChannels = MONITORED_CHANNELS;
	const channelConfig = monitoredChannels[message.channel.id];

	// Check if the channel is monitored for images
	if (!channelConfig || !channelConfig.image) {
		return;
	}

	const imageAttachments = message.attachments.filter(att =>
		att.contentType && att.contentType.startsWith('image/'),
	);

	if (imageAttachments.size > 0) {
		try {
			await message.react('🔍');
			await message.react('❤️');
		}
		catch (error) {
			console.error('Failed to add reaction:', error);
		}
	}
});

client.login(BOT_TOKEN);