const { getTweetIdFromUrl, fetchTweetData } = require('./twitterUtils');
const { createTweetEmbed } = require('../../utils/embedBuilder');

class TwitterService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/gi;
	}

	detectUrls(content) {
		return content.match(this.urlRegex) || [];
	}

	async processUrl(url) {
		const tweetId = getTweetIdFromUrl(url);
		if (!tweetId) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Invalid link format'),
			};
		}

		const tweetData = await fetchTweetData(tweetId);
		if (!tweetData) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Failed to get detailed information'),
			};
		}

		// Handle videos
		if (tweetData.media && tweetData.media.videos && tweetData.media.videos.length > 0) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url),
			};
		}

		// Handle photos
		if (tweetData.media && tweetData.media.photos && tweetData.media.photos.length > 0) {
			const imageUrls = tweetData.media.photos.map(p => p.url);
			const embeds = await createTweetEmbed(tweetData, url, imageUrls);
			return {
				type: 'embeds',
				content: embeds,
			};
		}

		// Handle text-only tweets
		const embeds = await createTweetEmbed(tweetData, url);
		return {
			type: 'embeds',
			content: embeds,
		};
	}

	createFallbackLink(originalUrl, reason = '') {
		const useFxTwitter = !reason.toLowerCase().includes('fxtwitter');
		const domain = useFxTwitter ? 'fxtwitter.com' : 'vxtwitter.com';
		const convertedLink = originalUrl.replace(/(twitter\.com|x\.com)/, domain);

		const reasonText = reason ? ` (${reason})` : '';
		return `\n${convertedLink}${reasonText}`;
	}
}

module.exports = TwitterService;