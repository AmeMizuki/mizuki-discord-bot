const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');
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

		if (metadata.type === 'comfyui') {
			let combinedPrompts = '';
			if (parsedMetadata.positivePrompt && parsedMetadata.positivePrompt !== 'N/A') {
				combinedPrompts += `**Positive:** ${parsedMetadata.positivePrompt}`;
			}
			if (parsedMetadata.negativePrompt && parsedMetadata.negativePrompt !== 'N/A') {
				if (combinedPrompts) combinedPrompts += '\n\n';
				combinedPrompts += `**Negative:** ${parsedMetadata.negativePrompt}`;
			}

			embed.addFields({
				name: 'ComfyUI Prompts',
				value: combinedPrompts ? `\`\`\`\n${truncateText(combinedPrompts)}\n\`\`\`` : 'N/A',
			});
		}
		else {
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
		}

		const parameterOrder = ['Model', 'Model hash', 'Steps', 'Sampler', 'CFG scale', 'Seed', 'Size', 'Denoising strength', 'Clip skip', 'Schedule Type'];

		for (const key of parameterOrder) {
			if (parsedMetadata.parameters[key] && parsedMetadata.parameters[key] !== 'N/A') {
				const paramValue = truncateText(parsedMetadata.parameters[key], 950);
				embed.addFields({ name: key, value: `\`\`\`\n${paramValue}\n\`\`\``, inline: true });
			}
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

async function createTweetEmbed(tweetData, originalTweetUrl, imageUrls = []) {
	if (!Array.isArray(imageUrls)) {
		imageUrls = imageUrls ? [imageUrls] : [];
	}

	const embeds = [];

	// If no images, create a single text-only embed
	if (imageUrls.length === 0) {
		const embed = new EmbedBuilder()
			.setColor(tweetData.color || EMBED_COLORS.INFO)
			.setAuthor({
				name: `@${tweetData.author.screen_name} (${tweetData.author.name})`,
				iconURL: tweetData.author.avatar_url,
				url: `https://twitter.com/${tweetData.author.screen_name}`,
			})
			.setTimestamp(new Date(tweetData.created_timestamp * 1000));

		if (tweetData.text) {
			embed.setDescription(tweetData.text);
		}

		if (tweetData.likes !== undefined) {
			embed.addFields({ name: '❤️ Likes', value: tweetData.likes.toLocaleString(), inline: true });
		}
		if (tweetData.retweets !== undefined) {
			embed.addFields({ name: '🔁 Retweets', value: tweetData.retweets.toLocaleString(), inline: true });
		}
		if (tweetData.replies !== undefined) {
			embed.addFields({ name: '💬 Replies', value: tweetData.replies.toLocaleString(), inline: true });
		}
		if (tweetData.views !== undefined && tweetData.views !== null) {
			embed.addFields({ name: '👀 Views', value: tweetData.views.toLocaleString(), inline: true });
		}

		embed.addFields({
			name: '🔗 Source',
			value: `[Original Tweet](${originalTweetUrl})`,
			inline: false,
		});

		embeds.push(embed);
	}
	else {
		// Create one embed for each image, following SaucyBot's pattern
		imageUrls.forEach((imageUrl) => {
			const embed = new EmbedBuilder()
				.setColor(tweetData.color || EMBED_COLORS.INFO)
				.setAuthor({
					name: `@${tweetData.author.screen_name} (${tweetData.author.name})`,
					iconURL: tweetData.author.avatar_url,
					url: `https://twitter.com/${tweetData.author.screen_name}`,
				})
				.setTimestamp(new Date(tweetData.created_timestamp * 1000))
				.setImage(imageUrl)
				.setURL(originalTweetUrl);

			if (tweetData.text) {
				embed.setDescription(tweetData.text);
			}

			if (tweetData.likes !== undefined) {
				embed.addFields({ name: '❤️ Likes', value: tweetData.likes.toLocaleString(), inline: true });
			}
			if (tweetData.retweets !== undefined) {
				embed.addFields({ name: '🔁 Retweets', value: tweetData.retweets.toLocaleString(), inline: true });
			}
			if (tweetData.replies !== undefined) {
				embed.addFields({ name: '💬 Replies', value: tweetData.replies.toLocaleString(), inline: true });
			}
			if (tweetData.views !== undefined && tweetData.views !== null) {
				embed.addFields({ name: '👀 Views', value: tweetData.views.toLocaleString(), inline: true });
			}

			embed.addFields({
				name: '🔗 Source',
				value: `[X (Twitter)](${originalTweetUrl})`,
				inline: false,
			});

			embeds.push(embed);
		});
	}

	return embeds;
}

async function createThreadsEmbed(post, originalUrl, imageUrls = []) {
	const embeds = [];

	const buildBase = () => {
		const embed = new EmbedBuilder()
			.setColor(EMBED_COLORS.GRAY)
			.setAuthor({
				name: `@${post.author.username} (${post.author.full_name})`,
				iconURL: post.author.avatar_url,
				url: post.author.url,
			})
			.setTimestamp(new Date(post.timestamp * 1000));

		if (post.content) {
			embed.setDescription(post.content);
		}

		if (post.stats) {
			embed.addFields(
				{ name: '❤️ Likes', value: post.stats.likes.toLocaleString(), inline: true },
				{ name: '💬 Comments', value: post.stats.comments.toLocaleString(), inline: true },
				{ name: '🔁 Reposts', value: post.stats.reposts.toLocaleString(), inline: true },
			);
		}

		embed.addFields({
			name: '🔗 Source',
			value: `[Threads](${originalUrl})`,
			inline: false,
		});

		return embed;
	};

	if (imageUrls.length === 0) {
		embeds.push(buildBase());
	}
	else {
		// Same trick as createTweetEmbed: multiple embeds sharing one URL make
		// Discord group them into a gallery, capped at 4 like X's preview.
		imageUrls.slice(0, 4).forEach((imageUrl) => {
			embeds.push(buildBase().setImage(imageUrl).setURL(originalUrl));
		});
	}

	return embeds;
}

// Scrapes a fix-domain page's Open Graph tags and builds an embed from them,
// so the reply can carry just the embed instead of a visible raw link.
// Returns null when there's a video (a bot-built embed can't autoplay one -
// Discord's own unfurl needs the link visible for that) or nothing usable was found.
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

module.exports = {
	createMetadataEmbed,
	createFavoriteImageEmbed,
	createTweetEmbed,
	createThreadsEmbed,
	fetchOgEmbed,
};