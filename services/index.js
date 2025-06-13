const TwitterService = require('./twitter/twitterService');
const PixivService = require('./pixiv/pixivService');
const PttService = require('./ptt/pttService');
const BilibiliService = require('./bilibili/bilibiliService');
const PchomeService = require('./pchome/pchomeService');
const RedditService = require('./reddit/redditService');
const CivitaiService = require('./civitai/civitaiService');
const { AttachmentBuilder } = require('discord.js');
const { URL } = require('url');

class UrlConversionService {
	constructor() {
		this.services = [
			new TwitterService(),
			new PixivService(),
			new PttService(),
			new BilibiliService(),
			new PchomeService(),
			new RedditService(),
			new CivitaiService(),
		];
		this.deniedDomains = [
			'exampledenied.com',
			'anothersite.net',
		];
	}

	isUrlDenied(url) {
		try {
			const parsedUrl = new URL(url);
			const hostname = parsedUrl.hostname;
			return this.deniedDomains.some(deniedDomain => hostname.includes(deniedDomain));
		}
		catch (error) {
			console.error('Error parsing URL for deny list check:', error);
			return false;
		}
	}

	async processMessage(content, message) {
		const results = [];

		for (const service of this.services) {
			const urls = service.detectUrls(content);
			if (urls.length > 0) {
				// Filter out denied URLs before processing
				const allowedUrls = urls.filter(url => !this.isUrlDenied(url));

				if (allowedUrls.length === 0) {
					continue;
				}

				// Suppress Discord's native embeds only if there are allowed URLs to process
				try {
					await message.suppressEmbeds(true);
				}
				catch (error) {
					console.error('Failed to suppress embeds:', error);
				}

				// Process each URL
				for (const url of allowedUrls) {
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
				case 'text':
					sentMessage = await channel.send(result.content);
					break;
				case 'embeds':
					if (result.attachmentUrl) {
						try {
							const attachment = new AttachmentBuilder(result.attachmentUrl);
							sentMessage = await channel.send({ embeds: result.content, files: [attachment] });
						}
						catch (attachError) {
							console.error('Failed to send attachment with embed:', attachError);
							sentMessage = await channel.send({ embeds: result.content });
						}
					}
					else {
						sentMessage = await channel.send({ embeds: result.content });
					}
					break;
				case 'video':
					try {
						const attachment = new AttachmentBuilder(result.content);
						sentMessage = await channel.send({ files: [attachment] });
					}
					catch (attachError) {
						console.error('Failed to send video attachment:', attachError);
						sentMessage = await channel.send(`無法預覽影片，但這是連結： ${result.content}`);
					}
					break;
				case 'video_with_embed':
					try {
						const attachment = new AttachmentBuilder(result.videoUrl);
						sentMessage = await channel.send({ embeds: [result.embed], files: [attachment] });
					}
					catch (attachError) {
						console.error('Failed to send video with embed:', attachError);
						// Fallback: send embed only
						try {
							sentMessage = await channel.send({ embeds: [result.embed] });
							await channel.send(`影片連結： ${result.videoUrl}`);
						}
						catch (embedError) {
							console.error('Failed to send embed fallback:', embedError);
							sentMessage = await channel.send(`無法預覽影片，但這是連結： ${result.videoUrl}`);
						}
					}
					break;
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
	RedditService,
	CivitaiService,
};