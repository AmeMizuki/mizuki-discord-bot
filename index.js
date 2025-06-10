require('dotenv').config();

const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const fetch = require('node-fetch').default;
// Explicitly get the default export for fetch
const ExifParser = require('exif-parser');
const extractChunks = require('png-chunks-extract');
const decodeText = require('png-chunk-text').decode;

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

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
// Bot 的 Client ID

// 輔助函式：解析 Metadata
async function getMetadata(imageUrl, contentType) {
	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		// 將 ArrayBuffer 轉換為 Node.js Buffer

		let sdParameters = null;

		if (contentType && contentType.startsWith('image/png')) {
			try {
				const chunks = extractChunks(buffer);
				const textChunks = [];
				for (const chunk of chunks) {
					if (chunk.name === 'tEXt' || chunk.name === 'zTXt') {
						const decoded = decodeText(chunk.data);
						// For PNG, collect all text chunks. parseStableDiffusionMetadata will handle parsing
						textChunks.push(decoded.text);
					}
				}
				if (textChunks.length > 0) {
					sdParameters = textChunks.join('\n');
					// Combine all text chunks
				}
			}
			catch (pngError) {
				console.error('Error parsing PNG chunks:', pngError);
			}
		}
		else if (contentType && contentType.startsWith('image/jpeg')) {
			try {
				const parser = ExifParser.create(buffer);
				const result = parser.parse();

				if (result.tags && result.tags.UserComment) {
					try {
						if (Buffer.isBuffer(result.tags.UserComment)) {
							sdParameters = result.tags.UserComment.toString('utf8');
						}
						else {
							sdParameters = result.tags.UserComment;
						}
					}
					catch (e) {
						console.error('Error decoding UserComment:', e);
						sdParameters = result.tags.UserComment;
					}
				}
			}
			catch (jpegError) {
				console.error('Error parsing JPEG EXIF:', jpegError);
			}
		}

		return sdParameters;

	}
	catch (error) {
		console.error('Error fetching or parsing image metadata:', error);
		return null;
	}
}

// 整理並顯示 metadata 的函式
async function parseStableDiffusionMetadata(metadataString) {
	const parsed = {
		positivePrompt: 'N/A',
		negativePrompt: 'N/A',
		parameters: {
			Steps: 'N/A',
			Sampler: 'N/A',
			'CFG scale': 'N/A',
			Seed: 'N/A',
			Size: 'N/A',
			Model: 'N/A',
			'Model hash': 'N/A',
			'Denoising strength': 'N/A',
			'Clip skip': 'N/A',
			'Schedule Type': 'N/A',
			Extra: 'N/A',
		},
	};

	let workingString = metadataString;

	// Find the position of "Negative prompt:"
	const negativePromptIndex = workingString.indexOf('Negative prompt:');

	// Find the first parameter to know where prompts end
	const parameterKeywords = ['Steps:', 'Sampler:', 'CFG scale:', 'Seed:', 'Size:', 'Model:', 'Model hash:', 'Denoising strength:', 'Clip skip:', 'Schedule Type:'];
	let firstParamIndex = -1;
	for (const keyword of parameterKeywords) {
		const index = workingString.indexOf(keyword);
		if (index !== -1 && (firstParamIndex === -1 || index < firstParamIndex)) {
			firstParamIndex = index;
		}
	}

	if (negativePromptIndex !== -1) {
		// Extract positive prompt (everything before "Negative prompt:")
		parsed.positivePrompt = workingString.substring(0, negativePromptIndex).trim();

		// Extract negative prompt (everything after "Negative prompt:" until first parameter or end)
		const negativeStart = negativePromptIndex + 'Negative prompt:'.length;
		const negativeEnd = (firstParamIndex !== -1 && firstParamIndex > negativePromptIndex) ? firstParamIndex : workingString.length;
		parsed.negativePrompt = workingString.substring(negativeStart, negativeEnd).trim();

		// Set working string to parameters section
		if (firstParamIndex !== -1) {
			workingString = workingString.substring(firstParamIndex);
		}
		else {
			workingString = '';
		}
	}
	else if (firstParamIndex !== -1) {
		// No negative prompt found, but parameters exist
		parsed.positivePrompt = workingString.substring(0, firstParamIndex).trim();
		workingString = workingString.substring(firstParamIndex);
	}
	else {
		// No negative prompt and no parameters found
		parsed.positivePrompt = workingString.trim();
		workingString = '';
	}

	// Parse parameters from the remaining string
	const paramRegex = /(Steps|Sampler|Schedule Type|CFG scale|Seed|Size|Model|Model hash|Denoising strength|Clip skip):\s*([^\n,]+)/g;
	let match;
	let lastParamMatchEndIndex = 0;
	while ((match = paramRegex.exec(workingString)) !== null) {
		const key = match[1].trim();
		const value = match[2].trim();
		parsed.parameters[key] = value;
		lastParamMatchEndIndex = paramRegex.lastIndex;
	}

	// Handle Extra information
	const afterParams = workingString.substring(lastParamMatchEndIndex).trim();
	if (afterParams) {
		const lines = afterParams.split('\n').map(line => line.trim()).filter(line => line.length > 0);
		const extraLines = [];
		for (const line of lines) {
			let isParamKey = false;
			for (const paramKey of parameterKeywords) {
				if (line.startsWith(paramKey)) {
					isParamKey = true;
					break;
				}
			}
			if (!isParamKey) {
				extraLines.push(line);
			}
		}
		if (extraLines.length > 0) {
			parsed.parameters.Extra = extraLines.join('\n');
		}
	}

	// Ensure we don't have empty strings
	if (!parsed.positivePrompt || parsed.positivePrompt === '') {
		parsed.positivePrompt = 'N/A';
	}
	if (!parsed.negativePrompt || parsed.negativePrompt === '') {
		parsed.negativePrompt = 'N/A';
	}

	return parsed;
}

async function sendMetadataReply(channel, authorId, metadata, sourceMessageUrl, imageUrl) {
	const embed = new EmbedBuilder();

	if (metadata) {
		const parsedMetadata = await parseStableDiffusionMetadata(metadata);

		embed
			.setTitle('✨ Image Metadata ✨')
			.setColor(0x0099FF)
			.addFields(
				{ name: 'Prompt (正面提示詞)', value: parsedMetadata.positivePrompt ? `\`\`\`\n${parsedMetadata.positivePrompt}\n\`\`\`` : 'N/A' },
				{ name: 'Negative Prompt (負面提示詞)', value: parsedMetadata.negativePrompt ? `\`\`\`\n${parsedMetadata.negativePrompt}\n\`\`\`` : 'N/A' },
			);

		for (const key in parsedMetadata.parameters) {
			if (parsedMetadata.parameters[key] && parsedMetadata.parameters[key] !== 'N/A') {
				embed.addFields({ name: key, value: `\`${parsedMetadata.parameters[key]}\``, inline: true });
			}
		}

	}
	else {
		embed
			.setTitle('Check Metadata')
			.setDescription('抱歉，沒有在圖片中找到相關資訊。\n可能是圖片不包含，或格式不符。')
			.setColor(0xFF0000);
	}

	if (imageUrl) {
		embed.setImage(imageUrl);
	}

	embed.setFooter({ text: '此訊息僅您可見。' });

	try {
		const user = await client.users.fetch(authorId);
		await user.send({ embeds: [embed] });
		if (sourceMessageUrl) {
			await user.send(`[原始訊息連結](${sourceMessageUrl})`);
		}
	}
	catch (error) {
		console.error(`Could not DM user ${authorId}:`, error);
	}
}


client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);
	const commands = [
		new SlashCommandBuilder()
			.setName('finddata')
			.setDescription('查看圖片的資訊')
			.addAttachmentOption(option =>
				option.setName('image')
					.setDescription('請提供圖片')
					.setRequired(true),
			),
	].map(command => command.toJSON());

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
		await interaction.deferReply({ ephemeral: true });

		const imageAttachment = interaction.options.getAttachment('image');

		if (!imageAttachment || !imageAttachment.contentType.startsWith('image/')) {
			await interaction.editReply({ content: '請提供一個有效的圖片檔案。', ephemeral: true });
			return;
		}

		const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);

		const embed = new EmbedBuilder();

		if (metadata) {
			const parsedMetadata = await parseStableDiffusionMetadata(metadata);

			embed
				.setTitle('✨ Image Metadata ✨')
				.setColor(0x0099FF)
				.addFields(
					{ name: 'Prompt (正面提示詞)', value: parsedMetadata.positivePrompt ? `\`\`\`\n${parsedMetadata.positivePrompt}\n\`\`\`` : 'N/A' },
					{ name: 'Negative Prompt (負面提示詞)', value: parsedMetadata.negativePrompt ? `\`\`\`\n${parsedMetadata.negativePrompt}\n\`\`\`` : 'N/A' },
				);

			for (const key in parsedMetadata.parameters) {
				if (parsedMetadata.parameters[key] && parsedMetadata.parameters[key] !== 'N/A') {
					embed.addFields({ name: key, value: `\`${parsedMetadata.parameters[key]}\``, inline: true });
				}
			}

		}
		else {
			embed
				.setTitle('Check Metadata')
				.setDescription('抱歉，沒有在圖片中找到相關資訊。\n可能是圖片不包含，或格式不符。')
				.setColor(0xFF0000);
		}

		if (imageAttachment && imageAttachment.url) {
			embed.setImage(imageAttachment.url);
		}

		embed.setFooter({ text: '此訊息僅您可見。' });

		await interaction.editReply({
			embeds: [embed],
			ephemeral: true,
		});
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

		// 檢查訊息是否包含圖片附件
		const imageAttachment = message.attachments.find(att => att.contentType && att.contentType.startsWith('image/'));

		if (imageAttachment) {
			// 給使用者一個回饋，讓他們知道機器人正在處理
			try {
				await user.send('正在提取圖片的資訊...');
			}
			catch (error) {
				console.warn(`Could not DM user ${user.tag}. They might have DMs disabled or bot is blocked. Error:`, error);
				// 如果無法私訊，可以考慮在原頻道發送一個短暫的 ephemeral 訊息（需要 `interaction` 或 `message` 物件的 `reply` 方法）
				// 為了簡潔，這裡暫時不實現頻道內的 ephemeral 提示
			}

			const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);

			// 私訊給添加反應的使用者
			await sendMetadataReply(message.channel, user.id, metadata, message.url, imageAttachment.url);

		}
		else {
			try {
				await user.send('這條訊息沒有包含圖片附件，無法提取資訊。');
			}
			catch (error) {
				console.warn(`Could not DM user ${user.tag}. Error:`, error);
			}
		}
	}
});


client.login(BOT_TOKEN);