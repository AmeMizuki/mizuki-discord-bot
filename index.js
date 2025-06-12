const { Client, GatewayIntentBits, Partials, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

// 導入配置和工具模組
const { BOT_TOKEN, CLIENT_ID, MONITORED_CHANNELS } = require('./config');
const { getMetadata } = require('./utils/metadata');
const { sendMetadataReply, createFavoriteImageEmbed } = require('./utils/embedBuilder');
const { UrlConversionService } = require('./services');
const { loadReactionRoles } = require('./utils/reactionRoleStorage');
const { commands, ...commandHandlers } = require('./commands');

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
});

client.on('interactionCreate', async interaction => {
	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === 'finddata') {
			await commandHandlers.handleFindDataCommand(interaction);
		}

		if (interaction.commandName === 'setchannel') {
			await commandHandlers.handleSetChannelCommand(interaction);
		}

		if (interaction.commandName === 'reactmessage') {
			await commandHandlers.handleReactMessageCommand(interaction);
		}
	}
	else if (interaction.isContextMenuCommand()) {
		if (interaction.commandName === 'Check Image Info') {
			await commandHandlers.handleViewImageInfoCommand(interaction);
		}
		else if (interaction.commandName === 'Favorite Image') {
			await commandHandlers.handleFavoriteImageCommand(interaction);
		}
		else if (interaction.commandName === 'Delete Message') {
			await commandHandlers.handleDeleteMessageCommand(interaction);
		}
		else if (interaction.commandName === 'Remove Bot Reactions') {
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
	const conversionResults = await urlConversionService.processMessage(message.content, message);

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