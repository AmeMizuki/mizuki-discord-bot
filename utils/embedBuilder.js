const { EmbedBuilder } = require('discord.js');
const { EMBED_COLORS } = require('../config');
const { parseStableDiffusionMetadata } = require('./metadata');

async function createMetadataEmbed(metadata, user, imageUrl = null) {
	const embed = new EmbedBuilder();

	if (metadata) {
		const parsedMetadata = await parseStableDiffusionMetadata(metadata);

		embed
			.setTitle('✨ Image Metadata ✨')
			.setColor(EMBED_COLORS.SUCCESS)
			.addFields(
				{ name: 'Prompt (正面提示詞)', value: parsedMetadata.positivePrompt ? `\`\`\`\n${parsedMetadata.positivePrompt}\n\`\`\`` : 'N/A' },
				{ name: 'Negative Prompt (負面提示詞)', value: parsedMetadata.negativePrompt ? `\`\`\`\n${parsedMetadata.negativePrompt}\n\`\`\`` : 'N/A' },
			);

		// Add parameter fields
		const parameterOrder = ['Model', 'Model hash', 'Steps', 'Sampler', 'CFG scale', 'Seed', 'Size', 'Denoising strength', 'Clip skip', 'Schedule Type'];

		for (const key of parameterOrder) {
			if (parsedMetadata.parameters[key] && parsedMetadata.parameters[key] !== 'N/A') {
				embed.addFields({ name: key, value: `\`\`\`\n${parsedMetadata.parameters[key]}\n\`\`\``, inline: true });
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

module.exports = {
	createMetadataEmbed,
	sendMetadataReply,
};