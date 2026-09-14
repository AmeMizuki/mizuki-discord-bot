const { SlashCommandBuilder } = require('discord.js');
const { parseTweetUrl, buildTranslatedTweetUrl } = require('../services/twitter/twitterUtils');

// Codes accepted by FxEmbed/FixupX (tw/cn/hk/jp/kr are their region aliases)
const TRANSLATION_LANGUAGES = [
	{ name: '繁體中文 (台灣)', value: 'tw' },
	{ name: '繁體中文 (香港)', value: 'hk' },
	{ name: '简体中文', value: 'cn' },
	{ name: 'English', value: 'en' },
	{ name: '日本語', value: 'jp' },
	{ name: '한국어', value: 'kr' },
	{ name: 'Français', value: 'fr' },
	{ name: 'Deutsch', value: 'de' },
	{ name: 'Español', value: 'es' },
	{ name: 'Português', value: 'pt' },
	{ name: 'Italiano', value: 'it' },
	{ name: 'Русский', value: 'ru' },
	{ name: 'العربية', value: 'ar' },
	{ name: 'ไทย', value: 'th' },
	{ name: 'Tiếng Việt', value: 'vi' },
	{ name: 'Bahasa Indonesia', value: 'id' },
	{ name: 'Bahasa Melayu', value: 'ms' },
	{ name: 'Türkçe', value: 'tr' },
	{ name: 'Polski', value: 'pl' },
	{ name: 'Nederlands', value: 'nl' },
	{ name: 'Українська', value: 'uk' },
	{ name: 'हिन्दी', value: 'hi' },
	{ name: 'Svenska', value: 'sv' },
];

// Translation commands
const translateCommands = [
	new SlashCommandBuilder()
		.setName('translate')
		.setDescription('將 Twitter/X 推文翻譯成指定語言，並以翻譯後的連結取代原本的預覽')
		.addStringOption(option =>
			option.setName('link')
				.setDescription('推文連結 (x.com、twitter.com 或 fixupx 等鏡像連結)')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('language')
				.setDescription('要翻譯成的語言')
				.setRequired(true)
				.addChoices(...TRANSLATION_LANGUAGES)),
];

// Suppress the native preview on the requester's own message holding the tweet
async function suppressOriginalEmbeds(interaction, tweetId) {
	if (!interaction.channel?.messages?.fetch) {
		return;
	}

	try {
		const messages = await interaction.channel.messages.fetch({ limit: 50 });
		const targets = messages.filter(message =>
			message.author.id === interaction.user.id
			&& message.embeds.length > 0
			&& (message.flags?.bitfield & 4) === 0
			&& message.content.includes(`/status/${tweetId}`));

		await Promise.all(targets.map(message => message.suppressEmbeds(true)));
	}
	catch (error) {
		console.error('Failed to suppress original tweet embeds:', error);
	}
}

async function handleTranslateCommand(interaction) {
	const link = interaction.options.getString('link');
	const language = interaction.options.getString('language');

	const tweet = parseTweetUrl(link);
	if (!tweet) {
		await interaction.reply({ content: '❌ 這不是有效的 Twitter/X 推文連結。', ephemeral: true });
		return;
	}

	await interaction.deferReply();

	await suppressOriginalEmbeds(interaction, tweet.tweetId);
	await interaction.editReply(buildTranslatedTweetUrl(tweet, language));
}

module.exports = {
	translateCommands,
	handleTranslateCommand,
};
