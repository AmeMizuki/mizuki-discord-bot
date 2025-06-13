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

async function sendMetadataReply(channel, authorId, metadata, sourceMessageUrl, imageUrl, originalAuthor) {
	const embed = await createMetadataEmbed(metadata, originalAuthor, imageUrl);

	try {
		const client = channel.client;
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

module.exports = {
	createMetadataEmbed,
	sendMetadataReply,
	createFavoriteImageEmbed,
	createTweetEmbed,
};