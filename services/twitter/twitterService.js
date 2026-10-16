const { getTweetIdFromUrl, fetchTweetData, buildTranslatedTweetMessage, getTweetMedia } = require('./twitterUtils');
const { createTweetEmbed } = require('../../utils/embedBuilder');

// FxEmbed mirror links with a translation suffix, e.g. fixupx.com/user/status/123/tw
const TRANSLATED_URL_REGEX = /https?:\/\/(?:www\.)?(?:fixupx|fixvx|fxtwitter|vxtwitter)\.com\/\S*?\/status\/(\d+)\/([a-z]{2})\b/gi;

class TwitterService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/gi;
	}

	detectUrls(content) {
		return [...(content.match(this.urlRegex) || []), ...(content.match(TRANSLATED_URL_REGEX) || [])];
	}

	async processUrl(url) {
		const translatedMatch = new RegExp(TRANSLATED_URL_REGEX.source, 'i').exec(url);
		if (translatedMatch) {
			const translated = await buildTranslatedTweetMessage(translatedMatch[1], translatedMatch[2].toLowerCase());
			return translated
				? { type: 'embeds', text: translated.text, content: translated.embeds }
				: { type: 'fallback', content: url };
		}

		const tweetId = getTweetIdFromUrl(url);
		if (!tweetId) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Invalid link format'),
			};
		}

		const tweetResult = await fetchTweetData(tweetId);
		if (!tweetResult) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Failed to get detailed information', 'fixupx'),
			};
		}

		const { data: tweetData, source } = tweetResult;

		if (!tweetData) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Failed to get detailed information', source),
			};
		}

		const { imageUrls, videoLinks } = await getTweetMedia(tweetData, url);
		return {
			type: 'embeds',
			text: videoLinks.join('\n') || undefined,
			content: await createTweetEmbed(tweetData, url, imageUrls),
		};
	}

	createFallbackLink(originalUrl, reason = '', source = 'fixupx') {
		const domain = source === 'vxtwitter' ? 'fixvx.com' : 'fixupx.com';
		const convertedLink = originalUrl.replace(/(twitter\.com|x\.com)/, domain);

		const reasonText = reason ? ` (${reason})` : '';
		return `\n${convertedLink}${reasonText}`;
	}

}

module.exports = TwitterService;