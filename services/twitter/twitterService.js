const { getTweetIdFromUrl, fetchTweetData } = require('./twitterUtils');
const { createTweetEmbed } = require('../../utils/embedBuilder');

class TwitterService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/gi;
	}

	/**
	 * Detects Twitter/X URLs in a message
	 * @param {string} content - Message content
	 * @returns {string[]} Array of Twitter URLs
	 */
	detectUrls(content) {
		return content.match(this.urlRegex) || [];
	}

	/**
	 * Processes a single Twitter URL and returns the appropriate response
	 * @param {string} url - Twitter URL
	 * @returns {Promise<{type: string, content: any}>} Processing result
	 */
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
				type: 'video',
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

	/**
	 * Creates a fallback fxtwitter link
	 * @param {string} originalUrl - Original Twitter URL
	 * @returns {string} Fallback message
	 */
	createFallbackLink(originalUrl) {
		const convertedLink = originalUrl.replace(/(twitter\.com|x\.com)/, 'fxtwitter.com');
		return `\n${convertedLink}`;
	}
}

module.exports = TwitterService;