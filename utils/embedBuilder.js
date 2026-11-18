const axios = require('axios');
const cheerio = require('cheerio');
const {
	EmbedBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder,
	MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { EMBED_COLORS } = require('../config');
const { parseStableDiffusionMetadata, parseComfyUIMetadata, parseSwarmUIMetadata } = require('./metadata');

// Helper function to truncate text to fit Discord embed field limits
function truncateText(text, maxLength = 1000) {
	if (!text || text === 'N/A') return text;
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + '...';
}

async function createMetadataEmbed(metadata, user, imageUrl = null) {
	const embed = new EmbedBuilder();

	if (metadata) {
		let parsedMetadata;

		// Handle different metadata types
		if (metadata.type === 'swarmui') {
			parsedMetadata = await parseSwarmUIMetadata(metadata.data);
		}
		else if (metadata.type === 'comfyui') {
			parsedMetadata = await parseComfyUIMetadata(metadata.data);
		}
		else if (metadata.type === 'stable-diffusion-webui') {
			parsedMetadata = await parseStableDiffusionMetadata(metadata.data);
		}
		else {
			parsedMetadata = await parseStableDiffusionMetadata(metadata);
		}

		embed
			.setTitle('✨ Image Metadata ✨')
			.setColor(EMBED_COLORS.SUCCESS);

		embed.addFields(
			{
				name: 'Prompt (正面提示詞)',
				value: parsedMetadata.positivePrompt && parsedMetadata.positivePrompt !== 'N/A'
					? `\`\`\`\n${truncateText(parsedMetadata.positivePrompt)}\n\`\`\``
					: 'N/A',
			},
			{
				name: 'Negative Prompt (負面提示詞)',
				value: parsedMetadata.negativePrompt && parsedMetadata.negativePrompt !== 'N/A'
					? `\`\`\`\n${truncateText(parsedMetadata.negativePrompt)}\n\`\`\``
					: 'N/A',
			},
		);

		const parameterOrder = ['Model', 'Model hash', 'LoRA', 'VAE', 'Steps', 'Sampler', 'CFG scale', 'Seed', 'Size', 'Denoising strength', 'Clip skip', 'Schedule Type', 'Upscale model', 'Upscale method'];
		const parameters = parameterOrder.filter(key => parsedMetadata.parameters[key] && parsedMetadata.parameters[key] !== 'N/A');
		// Reserve room for the footer and every field, including long LoRA/upscaler lists.
		const fieldOverhead = parameters.reduce((length, key) => length + key.length + 11, 0);
		const parameterLimit = Math.min(950, Math.floor((5800 - embed.length - fieldOverhead) / (parameters.length || 1)));

		for (const key of parameters) {
			const paramValue = truncateText(parsedMetadata.parameters[key], parameterLimit);
			embed.addFields({ name: key, value: `\`\`\`\n${paramValue}\n\`\`\``, inline: true });
		}
	}
	else {
		embed
			.setTitle('Check Metadata')
			.setDescription('抱歉，沒有在圖片中找到相關資訊呢～\n可能是圖片不包含 metadata，或格式不符合喔！')
			.setColor(EMBED_COLORS.ERROR);
	}

	if (imageUrl) {
		embed.setImage(imageUrl);
	}

	if (user) {
		embed.setFooter({
			text: `Posted by ${user.displayName || user.username}`,
			iconURL: user.displayAvatarURL(),
		});
	}

	return embed;
}

async function createFavoriteImageEmbed(imageUrl, messageUrl, user) {
	const embed = new EmbedBuilder()
		.setTitle('❤️ 收藏圖片')
		.setColor('#DDAACC');

	if (imageUrl) {
		embed.setImage(imageUrl);
	}

	if (messageUrl) {
		embed.addFields({
			name: '原始訊息連結',
			value: `[點我查看](${messageUrl})`,
			inline: false,
		});
	}

	if (user) {
		embed.setFooter({
			text: `收藏者：${user.displayName || user.username}`,
			iconURL: user.displayAvatarURL(),
		});
	}

	embed.setTimestamp();

	return embed;
}

// Bot name/avatar for tweet footers, set once the client is ready.
let botFooter = null;
let botAvatarEmoji = '';

async function initBotSignature(client) {
	const iconURL = client.user.displayAvatarURL({ extension: 'png', size: 128 });
	botFooter = { text: client.user.displayName, iconURL };
	try {
		const emojis = await client.application.emojis.fetch();
		const emoji = emojis.find(item => item.name === 'bot_avatar')
			?? await client.application.emojis.create({ attachment: iconURL, name: 'bot_avatar' });
		botAvatarEmoji = emoji.toString();
	}
	catch (error) {
		console.error('Failed to set up bot avatar emoji:', error);
	}
}

async function createTweetEmbed(tweetData, originalTweetUrl, imageUrls = []) {
	if (!Array.isArray(imageUrls)) {
		imageUrls = imageUrls ? [imageUrls] : [];
	}

	const embeds = (imageUrls.length ? imageUrls : [null]).map((imageUrl, index) => {
		const embed = new EmbedBuilder()
			.setColor(tweetData.color || EMBED_COLORS.INFO)
			.setAuthor({
				name: `@${tweetData.author.screen_name} (${tweetData.author.name})`,
				iconURL: tweetData.author.avatar_url,
				url: `https://twitter.com/${tweetData.author.screen_name}`,
			})
			.setTimestamp(new Date(tweetData.created_timestamp * 1000));

		if (imageUrl) {
			embed.setImage(imageUrl).setURL(originalTweetUrl);
		}

		// Discord galleries show text only on the first image; don't duplicate fields.
		if (index === 0) {
			if (tweetData.text) {
				embed.setDescription(tweetData.text.substring(0, 4000));
			}
			const stats = [
				['❤️', tweetData.likes], ['🔁', tweetData.retweets], ['💬', tweetData.replies], ['👀', tweetData.views],
			].filter(([, count]) => count !== undefined && count !== null)
				.map(([emoji, count]) => `${emoji} ${count.toLocaleString()}`);
			if (stats.length) {
				embed.addFields({ name: '\u200b', value: stats.join('　'), inline: false });
			}
			embed.addFields({
				name: '🔗 Source',
				value: `[${imageUrl ? 'X (Twitter)' : 'Original Tweet'}](${originalTweetUrl})`,
				inline: false,
			});
		}
		if (botFooter) embed.setFooter(botFooter);
		return embed;
	});

	return embeds;
}

async function createTranslatedTweetEmbed(tweetData, originalTweetUrl, quotedTweet = null) {
	const [embed] = await createTweetEmbed(tweetData, originalTweetUrl);
	embed.setURL(originalTweetUrl);

	if (quotedTweet?.url) {
		const author = quotedTweet.author;
		embed.addFields({
			name: '\u200b',
			value: `>> 引用 [${author?.name || author?.screen_name || '查看原推文'}](${quotedTweet.url})`,
			inline: false,
		});
	}
	if (quotedTweet?.text) {
		// Reserve room for the footer, invisible field names and quote markers.
		const fieldName = '\u200b';
		const limit = Math.min(4000, Math.max(0, 5700 - embed.length - 4 * (fieldName.length + 3)));
		const quotedText = quotedTweet.text.replace(/\n/g, '\n>> ');
		const text = quotedText.length > limit && limit > 3
			? quotedText.substring(0, limit - 3) + '...'
			: quotedText.substring(0, limit);
		for (let offset = 0; offset < text.length; offset += 1021) {
			embed.addFields({ name: fieldName, value: `>> ${text.substring(offset, offset + 1021)}`, inline: false });
		}
	}
	return embed;
}

async function fetchOgEmbed(url) {
	try {
		const { data } = await axios.get(url, {
			timeout: 7000,
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' },
		});
		const $ = cheerio.load(data);
		const getMeta = (property) => $(`meta[property="${property}"]`).attr('content') || $(`meta[name="${property}"]`).attr('content');

		if (getMeta('og:video') || getMeta('og:video:url')) {
			return null;
		}

		const title = getMeta('og:title');
		const description = getMeta('og:description');
		const image = getMeta('og:image');

		if (!title && !image) {
			return null;
		}

		const embed = new EmbedBuilder()
			.setColor(EMBED_COLORS.GRAY)
			.setURL(url);

		if (title) embed.setTitle(title.substring(0, 256));
		if (description) embed.setDescription(description.substring(0, 4000));
		if (image) embed.setImage(image);

		return embed;
	}
	catch (error) {
		console.warn(`OG embed fetch failed for ${url}: ${error.message}`);
		return null;
	}
}

const GALLERY_SIZE = 10;
const MORE_BUTTON_ID = 'tweet_more_images';

// Embed galleries show only 4 images, so tweets with more are rebuilt as Components V2
function buildTweetCards(embeds, videoLinks) {
	const data = embeds.map(embed => embed.data ?? embed);
	const images = data.map(item => item.image?.url).filter(Boolean);
	if (images.length <= 4) return null;

	const [main] = data;
	const head = main.author ? [`**[${main.author.name}](${main.author.url})**`] : [];
	const tail = (main.fields ?? []).map(field => (field.name === '\u200b' ? field.value : `**${field.name}**\n${field.value}`));
	const footer = [
		main.footer && `${botAvatarEmoji} ${main.footer.text}`.trim(),
		main.timestamp && `<t:${Math.floor(Date.parse(main.timestamp) / 1000)}:f>`,
	].filter(Boolean).join(' | ');
	if (footer) tail.push(`-# ${footer}`);

	const budget = 4000 - (videoLinks?.length ?? 0);
	const fixed = [...head, ...tail].join('\n').length + 1;
	const description = main.description?.substring(0, Math.max(0, budget - fixed));
	const text = new TextDisplayBuilder()
		.setContent([...head, description, ...tail].filter(Boolean).join('\n').substring(0, budget));

	const gallery = urls => new MediaGalleryBuilder()
		.addItems(...urls.map(url => new MediaGalleryItemBuilder().setURL(url)));
	const container = () => new ContainerBuilder().setAccentColor(main.color);

	const card = container();
	if (main.author?.icon_url) {
		card.addSectionComponents(new SectionBuilder()
			.addTextDisplayComponents(text)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(main.author.icon_url)));
	}
	else {
		card.addTextDisplayComponents(text);
	}
	card.addMediaGalleryComponents(gallery(images.slice(0, GALLERY_SIZE)));

	const components = videoLinks
		? [new TextDisplayBuilder().setContent(videoLinks), new SeparatorBuilder(), card]
		: [card];
	const flags = MessageFlags.IsComponentsV2;
	const pages = [{ components, flags }];
	for (let i = GALLERY_SIZE; i < images.length; i += GALLERY_SIZE) {
		pages.push({ components: [container().addMediaGalleryComponents(gallery(images.slice(i, i + GALLERY_SIZE)))], flags });
	}
	return pages;
}

// Sends the first card via `send`; overflow cards follow when anyone clicks "More".
async function sendTweetCards(send, [first, ...overflow]) {
	if (overflow.length === 0) return send(first);

	const more = new ActionRowBuilder().addComponents(new ButtonBuilder()
		.setCustomId(MORE_BUTTON_ID).setEmoji('➕').setLabel('More').setStyle(ButtonStyle.Primary));
	const message = await send({ ...first, components: [...first.components, more] });
	const collector = message.createMessageComponentCollector({
		filter: interaction => interaction.customId === MORE_BUTTON_ID,
		max: 1,
		time: 600000,
	});
	collector.on('collect', async interaction => {
		await interaction.deferUpdate();
		for (const page of overflow) {
			await message.channel.send(page).catch(console.error);
		}
	});
	collector.on('end', () => message.edit(first).catch(console.error));
	return message;
}

module.exports = {
	createMetadataEmbed,
	createFavoriteImageEmbed,
	createTweetEmbed,
	createTranslatedTweetEmbed,
	fetchOgEmbed,
	initBotSignature,
	buildTweetCards,
	sendTweetCards,
};