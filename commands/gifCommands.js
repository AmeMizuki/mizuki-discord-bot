const { ApplicationCommandType, ContextMenuCommandBuilder, AttachmentBuilder } = require('discord.js');
const GifService = require('../services/gif/gifService');

const gifService = new GifService();
const videoExtensionRegex = /\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv|asf|ogv)$/i;

const gifCommands = [
	new ContextMenuCommandBuilder()
		.setName('轉換為GIF')
		.setType(ApplicationCommandType.Message),
];

function findVideoUrl(message) {
	const videoAttachment = message.attachments.find(attachment =>
		(attachment.contentType && attachment.contentType.startsWith('video/')) ||
		videoExtensionRegex.test(attachment.name || ''),
	);
	if (videoAttachment) {
		return videoAttachment.url;
	}

	const videoEmbed = message.embeds.find(embed => embed.video && embed.video.url);
	if (videoEmbed) {
		return videoEmbed.video.proxyURL || videoEmbed.video.url;
	}

	return null;
}

async function handleConvertToGifCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const videoUrl = findVideoUrl(message);

	if (!videoUrl) {
		await interaction.editReply({ content: '❌ 這則訊息沒有影片附件，也沒有可讀取的影片連結預覽（如果是連結，請稍等 Discord 產生預覽後再試一次）。' });
		return;
	}

	const aheadCount = gifService.pending;
	if (aheadCount > 0) {
		await interaction.editReply({ content: `⏳ 已加入轉換佇列，前面還有 ${aheadCount} 個轉換任務，請稍候...` });
	}

	try {
		const gifUrl = await gifService.convertVideoToGif(videoUrl);

		try {
			await message.channel.send({ files: [new AttachmentBuilder(gifUrl, { name: 'converted.gif' })] });
			await interaction.editReply({ content: '✅ 轉換完成！' });
		}
		catch (attachError) {
			console.error('Failed to upload converted GIF as attachment:', attachError);
			await interaction.editReply({ content: '❌ GIF 檔案過大，無法上傳到這個頻道。' });
		}
	}
	catch (error) {
		console.error('Failed to convert video to GIF:', error);
		await interaction.editReply({ content: `❌ 轉換失敗：${error.message}` });
	}
}

module.exports = {
	gifCommands,
	handleConvertToGifCommand,
};
