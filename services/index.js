const TwitterService = require('./twitter/twitterService');

class UrlConversionService {
	constructor() {
		this.services = [
			new TwitterService(),
			// 未來可以在這裡新增其他服務，例如：
			// new InstagramService(),
			// new TikTokService(),
			// new YouTubeService(),
		];
	}

	/**
	 * Processes a message and handles all supported URL conversions
	 * @param {string} content - Message content
	 * @param {Object} message - Discord message object
	 * @returns {Promise<Array>} Array of processing results
	 */
	async processMessage(content, message) {
		const results = [];

		for (const service of this.services) {
			const urls = service.detectUrls(content);
			if (urls.length > 0) {
				// Suppress Discord's native embeds for detected URLs
				try {
					await message.suppressEmbeds(true);
				}
				catch (error) {
					console.error('Failed to suppress embeds:', error);
				}

				// Process each URL
				for (const url of urls) {
					try {
						const result = await service.processUrl(url);
						results.push(result);
					}
					catch (error) {
						console.error(`Failed to process URL ${url}:`, error);
						results.push({
							type: 'error',
							content: `處理連結時發生錯誤：${url}`,
						});
					}
				}
			}
		}

		return results;
	}

	/**
	 * Sends processing results to a Discord channel
	 * @param {Array} results - Processing results
	 * @param {Object} channel - Discord channel object
	 */
	async sendResults(results, channel) {
		for (const result of results) {
			try {
				switch (result.type) {
				case 'embeds':
					await channel.send({ embeds: result.content });
					break;
				case 'video':
				case 'fallback':
				case 'error':
					await channel.send(result.content);
					break;
				default:
					console.warn(`Unknown result type: ${result.type}`);
				}
			}
			catch (error) {
				console.error('Failed to send result:', error);
			}
		}
	}
}

module.exports = {
	UrlConversionService,
	TwitterService,
};