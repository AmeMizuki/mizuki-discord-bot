const TwitterService = require('./twitter/twitterService');
const PixivService = require('./pixiv/pixivService');
const PttService = require('./ptt/pttService');
const BilibiliService = require('./bilibili/bilibiliService');
const PchomeService = require('./pchome/pchomeService');
const RedditService = require('./reddit/redditService');
const CivitaiService = require('./civitai/civitaiService');
const EhentaiService = require('./ehentai/ehentaiService');
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
			new EhentaiService(),
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
				case 'embeds': {
					result.content.forEach(embed => {
						const footer = embed.footer || {};
						embed.footer = {
							text: footer.text ? `${footer.text} • ${channel.client.user.username}` : channel.client.user.username,
							iconURL: channel.client.user.displayAvatarURL(),
						};
					});
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
				}
				case 'video': {
					try {
						const attachment = new AttachmentBuilder(result.content);
						sentMessage = await channel.send({ files: [attachment] });
					}
					catch (attachError) {
						console.error('Failed to send video attachment:', attachError);
						sentMessage = await channel.send(`無法預覽影片，但這是連結： ${result.content}`);
					}
					break;
				}
				case 'video_with_embed': {
					const footer = result.embed.footer || {};
					result.embed.footer = {
						text: footer.text ? `${footer.text} • ${channel.client.user.username}` : channel.client.user.username,
						iconURL: channel.client.user.displayAvatarURL(),
					};
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
				}
				case 'pixiv_embed':
					sentMessage = await this.handlePixivEmbed(channel, result.data, originalMessage);
					break;
				case 'ehentai_embed':
					sentMessage = await this.handleEhentaiEmbed(channel, result.data);
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

	async handlePixivEmbed(channel, data, originalMessage) {
		let currentPage = 0;

		const createEmbed = (page) => {
			const embed = new EmbedBuilder()
				.setColor(0x0099FF)
				.setTitle(data.title)
				.setURL(data.url)
				.setAuthor({ name: `🧑‍🎨 ${data.author}`, url: data.authorUrl })
				.setImage(data.imageUrls[page])
				.setFooter({
					text: `Page ${page + 1} of ${data.pageCount}`,
				});

			if (data.description) {
				const cleanedDescription = data.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
				embed.setDescription(cleanedDescription.substring(0, 1000));
			}

			embed.addFields(
				{ name: '⭐ 收藏', value: data.bookmarkCount.toString(), inline: true },
			);

			return embed;
		};

		const createActionRow = (page) => {
			return new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('prev_page')
						.setLabel('◀️')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page === 0),
					new ButtonBuilder()
						.setCustomId('next_page')
						.setLabel('▶️')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page === data.pageCount - 1),
				);
		};

		const messagePayload = {
			embeds: [createEmbed(currentPage)],
			components: data.pageCount > 1 ? [createActionRow(currentPage)] : [],
		};

		const sentMessage = await channel.send(messagePayload);

		if (data.pageCount <= 1) {
			return sentMessage;
		}

		const collector = sentMessage.createMessageComponentCollector({
			time: 300000,
		});

		collector.on('collect', async interaction => {
			if (interaction.user.id !== originalMessage.author.id) {
				await interaction.reply({ content: 'You cannot control this embed.', ephemeral: true });
				return;
			}

			if (interaction.customId === 'prev_page') {
				currentPage--;
			}
			else if (interaction.customId === 'next_page') {
				currentPage++;
			}

			await interaction.update({
				embeds: [createEmbed(currentPage)],
				components: [createActionRow(currentPage)],
			});
		});

		collector.on('end', () => {
			sentMessage.edit({ components: [] }).catch(console.error);
		});

		return sentMessage;
	}

	async handleEhentaiEmbed(channel, data) {
		const embed = new EmbedBuilder()
			.setColor(0xA1859A)
			.setTitle(data.title)
			.setURL(data.url)
			.setImage(data.thumbnail)
			.setFooter({
				text: `📂 ${data.category} • ⭐ ${data.rating} • 👤 ${data.uploader}`,
			})
			.setDescription(data.tags.substring(0, 4000));

		return await channel.send({ embeds: [embed] });
	}

	storeMessageRelation(botMessageId, userId, originalMessageId) {
		if (!this.messageRelations) {
			this.messageRelations = new Map();
		}

		this.messageRelations.set(botMessageId, {
			userId,
			originalMessageId,
			timestamp: Date.now(),
		});

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
	EhentaiService,
};