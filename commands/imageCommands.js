const { ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');
const { getMetadata } = require('../utils/metadata');
const { createMetadataEmbed, createFavoriteImageEmbed } = require('../utils/embedBuilder');

// Image-related commands
const imageCommands = [
	new ContextMenuCommandBuilder()
		.setName('檢查圖片資訊')
		.setType(ApplicationCommandType.Message),
	new ContextMenuCommandBuilder()
		.setName('收藏圖片')
		.setType(ApplicationCommandType.Message),
];

// Handle View Image Info command
async function handleViewImageInfoCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));

	if (imageAttachments.size === 0) {
		await interaction.editReply({ content: '❌ 這則訊息沒有圖片附件。', ephemeral: true });
		return;
	}

	for (const imageAttachment of imageAttachments.values()) {
		const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);
		const embed = await createMetadataEmbed(metadata, interaction.user, imageAttachment.url);
		await interaction.user.send({ embeds: [embed] });
	}

	await interaction.editReply({ content: '✅ 我已經將所有圖片的資訊發送給你。', ephemeral: true });
}

// Handle the "Favorite Image" context menu command
async function handleFavoriteImageCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));

	if (imageAttachments.size === 0) {
		await interaction.editReply({ content: '❌ 這則訊息沒有圖片附件。我無法收藏它。', ephemeral: true });
		return;
	}

	for (const imageAttachment of imageAttachments.values()) {
		try {
			const favoriteEmbed = await createFavoriteImageEmbed(imageAttachment.url, message.url, interaction.user);
			await interaction.user.send({ embeds: [favoriteEmbed] });
		}
		catch (error) {
			console.error('Failed to send favorite image via context menu to user:', error);
			await interaction.user.send({ content: `收藏圖片失敗。請檢查您的隱私設定或重試。圖片連結：${imageAttachment.url}`, ephemeral: true });
		}
	}

	await interaction.editReply({ content: '✅ 所有圖片已經被收藏並發送給你。', ephemeral: true });
}

module.exports = {
	imageCommands,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
};