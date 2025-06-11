const { Client, GatewayIntentBits, Partials, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

// 導入配置和工具模組
const { BOT_TOKEN, CLIENT_ID, MONITORED_CHANNELS } = require('./config');
const { getMetadata } = require('./utils/metadata');
const { sendMetadataReply } = require('./utils/embedBuilder');
const { commands, handleFindDataCommand, handleSetChannelCommand } = require('./commands');

// 確保 Bot 有權限讀取訊息內容、訊息歷史、發送訊息、管理表情符號等
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		// 必須啟用，才能讀取訊息內容和附件
		GatewayIntentBits.GuildMessageReactions,
		// 監聽表情符號反應
		GatewayIntentBits.DirectMessages,
		// 允許 Bot 私訊使用者
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
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
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'finddata') {
		await handleFindDataCommand(interaction);
	}

	if (interaction.commandName === 'setchannel') {
		await handleSetChannelCommand(interaction);
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.emoji.name === '🔍' && !user.bot) {
		if (reaction.partial) {
			try {
				await reaction.fetch();
			}
			catch (error) {
				console.error('Something went wrong when fetching the message:', error);
				return;
			}
		}
		if (reaction.message.partial) {
			try {
				await reaction.message.fetch();
			}
			catch (error) {
				console.error('Something went wrong when fetching the message:', error);
				return;
			}
		}

		const message = reaction.message;
		const imageAttachment = message.attachments.find(att => att.contentType && att.contentType.startsWith('image/'));

		if (imageAttachment) {
			try {
				await user.send('正在幫你提取圖片的資訊喔～請稍等一下！');
			}
			catch (error) {
				console.warn(`Could not DM user ${user.tag}. They might have DMs disabled or bot is blocked. Error:`, error);
			}

			const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);
			await sendMetadataReply(message.channel, user.id, metadata, message.url, imageAttachment.url, message.author);
		}
		else {
			try {
				await user.send('咦？這條訊息沒有包含圖片附件耶，我沒辦法提取資訊喔～');
			}
			catch (error) {
				console.warn(`Could not DM user ${user.tag}. Error:`, error);
			}
		}
	}
});

client.on('messageCreate', async message => {
	// 忽略機器人自己的訊息
	if (message.author.bot) return;

	if (MONITORED_CHANNELS.length === 0 || !MONITORED_CHANNELS.includes(message.channel.id)) {
		return;
	}

	const imageAttachment = message.attachments.find(att =>
		att.contentType && att.contentType.startsWith('image/'),
	);

	if (imageAttachment) {
		try {
			await message.react('🔍');
		}
		catch (error) {
			console.error('Failed to add reaction:', error);
		}
	}
});

client.login(BOT_TOKEN);