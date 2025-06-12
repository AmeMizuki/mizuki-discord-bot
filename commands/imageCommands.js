const { SlashCommandBuilder, ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');
const { getMetadata } = require('../utils/metadata');
const { createMetadataEmbed, createFavoriteImageEmbed } = require('../utils/embedBuilder');

// Image-related commands
const imageCommands = [
	new SlashCommandBuilder()
		.setName('finddata')
		.setDescription('Check information of an image')
		.addAttachmentOption(option =>
			option.setName('image')
				.setDescription('The image to check')
				.setRequired(true),
		),
	new ContextMenuCommandBuilder()
		.setName('Check Image Info')
		.setType(ApplicationCommandType.Message),
	new ContextMenuCommandBuilder()
		.setName('Favorite Image')
		.setType(ApplicationCommandType.Message),
];

// 處理 finddata 指令
async function handleFindDataCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const imageAttachment = interaction.options.getAttachment('image');

	if (!imageAttachment || !imageAttachment.contentType.startsWith('image/')) {
		await interaction.editReply({ content: 'Please provide a valid image file.', ephemeral: true });
		return;
	}

	const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);
	const embed = await createMetadataEmbed(metadata, interaction.user, imageAttachment.url);

	await interaction.editReply({
		embeds: [embed],
		ephemeral: true,
	});
}

// 處理 View Image Info 指令
async function handleViewImageInfoCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));

	if (imageAttachments.size === 0) {
		await interaction.editReply({ content: '❌ This message has no image attachments.', ephemeral: true });
		return;
	}

	for (const imageAttachment of imageAttachments.values()) {
		const metadata = await getMetadata(imageAttachment.url, imageAttachment.contentType);
		const embed = await createMetadataEmbed(metadata, interaction.user, imageAttachment.url);
		await interaction.user.send({ embeds: [embed] });
	}

	await interaction.editReply({ content: '✅ I have sent the information of all images to you.', ephemeral: true });
}

// Handle the "Favorite Image" context menu command
async function handleFavoriteImageCommand(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const message = interaction.targetMessage;
	const imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));

	if (imageAttachments.size === 0) {
		await interaction.editReply({ content: '❌ This message has no image attachments. I cannot collect it.', ephemeral: true });
		return;
	}

	for (const imageAttachment of imageAttachments.values()) {
		try {
			const favoriteEmbed = await createFavoriteImageEmbed(imageAttachment.url, message.url, interaction.user);
			await interaction.user.send({ embeds: [favoriteEmbed] });
		}
		catch (error) {
			console.error('Failed to send favorite image via context menu to user:', error);
			await interaction.user.send({ content: `Failed to collect the image. Please check your privacy settings or try again. Image link: ${imageAttachment.url}`, ephemeral: true });
		}
	}

	await interaction.editReply({ content: '✅ All images have been collected and sent to you.', ephemeral: true });
}

module.exports = {
	imageCommands,
	handleFindDataCommand,
	handleViewImageInfoCommand,
	handleFavoriteImageCommand,
};