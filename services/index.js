const TwitterService = require('./twitter/twitterService');
const PixivService = require('./pixiv/pixivService');
const PttService = require('./ptt/pttService');
const BilibiliService = require('./bilibili/bilibiliService');
const PchomeService = require('./pchome/pchomeService');

class UrlConversionService {
	constructor() {
		this.services = [
			new TwitterService(),
			new PixivService(),
			new PttService(),
			new BilibiliService(),
			new PchomeService(),
		];
	}

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
							content: `Error processing URL: ${url}`,
						});
					}
				}
			}
		}

		return results;
	}

	async sendResults(results, channel, originalMessage = null) {
		for (const result of results) {
			try {
				let sentMessage;
				switch (result.type) {
				case 'embeds':
					sentMessage = await channel.send({ embeds: result.content });
					break;
				case 'video':
				case 'fallback':
				case 'error':
					sentMessage = await channel.send(result.content);
					break;
				default:
					console.warn(`Unknown result type: ${result.type}`);
				}

				if (sentMessage && originalMessage) {
					this.storeMessageRelation(sentMessage.id, originalMessage.author.id, originalMessage.id);
				}
			}
			catch (error) {
				console.error('Failed to send result:', error);
			}
		}
	}

	storeMessageRelation(botMessageId, userId, originalMessageId) {
		// Simple in-memory storage with cleanup after 1 hour
		if (!this.messageRelations) {
			this.messageRelations = new Map();
		}

		this.messageRelations.set(botMessageId, {
			userId,
			originalMessageId,
			timestamp: Date.now(),
		});

		// Clean up old entries (older than 1 hour)
		const oneHourAgo = Date.now() - (60 * 60 * 1000);
		for (const [messageId, data] of this.messageRelations.entries()) {
			if (data.timestamp < oneHourAgo) {
				this.messageRelations.delete(messageId);
			}
		}
	}

	canUserDeleteMessage(botMessageId, userId) {
		if (!this.messageRelations) {
			return false;
		}

		const relation = this.messageRelations.get(botMessageId);
		return relation && relation.userId === userId;
	}
}

module.exports = {
	UrlConversionService,
	TwitterService,
	PixivService,
	PttService,
	BilibiliService,
	PchomeService,
};