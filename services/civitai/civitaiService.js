const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');
const path = require('path');

class CivitaiService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?civitai\.com\/models\/(\d+)(?:\/[^?\s]*)?/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		try {
			const match = url.match(/https?:\/\/(?:www\.)?civitai\.com\/models\/(\d+)(?:\/[^?\s]*)?/);
			if (!match) {
				throw new Error('Invalid Civitai URL format.');
			}
			const modelId = match[1];

			const apiUrl = `https://civitai.com/api/v1/models/${modelId}`;
			const { data } = await axios.get(apiUrl, { timeout: 10000 });

			const title = data.name;
			let description = data.description;
			let mediaUrl = null;
			let mediaType = 'image';

			// Extract media from modelVersions if available
			if (data.modelVersions && data.modelVersions.length > 0) {
				const latestVersion = data.modelVersions[0];
				if (latestVersion.images && latestVersion.images.length > 0) {
					const firstImage = latestVersion.images[0];
					mediaUrl = firstImage.url;

					// Determine if it's a video based on common video file extensions
					if (mediaUrl && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'))) {
						mediaType = 'video';
					}
				}
			}

			// Check if title or media is missing
			if (!title || !mediaUrl) {
				throw new Error('Could not find model title or media from API.');
			}

			// Clean up description HTML tags and format it better
			if (description) {
				// Use cheerio to parse HTML and extract text content
				const $ = cheerio.load(description);

				// Remove script and style elements
				$('script, style').remove();

				// Convert some HTML elements to readable text
				$('br').replaceWith('\n');
				$('p').each(function() {
					$(this).after('\n\n');
				});
				$('li').each(function() {
					$(this).prepend('• ').after('\n');
				});
				$('h1, h2, h3, h4, h5, h6').each(function() {
					$(this).prepend('**').append('**\n');
				});
				$('strong, b').each(function() {
					$(this).prepend('**').append('**');
				});
				$('em, i').each(function() {
					$(this).prepend('*').append('*');
				});
				$('code').each(function() {
					$(this).prepend('`').append('`');
				});

				// Get the text content
				description = $.text();

				// Clean up extra whitespace and newlines
				description = description
					.replace(/\n\s*\n\s*\n/g, '\n\n')
					.replace(/[ \t]+/g, ' ')
					.trim();

				// Limit description length for Discord embed
				if (description.length > 500) {
					description = description.substring(0, 500) + '...';
				}
			}

			if (mediaType === 'video') {
				// For videos, create an embed with description and send video as attachment
				const embed = new EmbedBuilder()
					.setTitle(title)
					.setURL(url)
					.setColor('#00BFFF');

				if (description) {
					embed.setDescription(description);
				}

				// Add model type and stats if available
				if (data.type) {
					embed.addFields({ name: '🔍 類型', value: data.type, inline: true });
				}

				if (data.stats) {
					const stats = [];
					if (data.stats.downloadCount) stats.push(`🔄 下載次數: ${data.stats.downloadCount.toLocaleString()}`);
					if (data.stats.thumbsUpCount) stats.push(`👍 ${data.stats.thumbsUpCount.toLocaleString()}`);
					if (stats.length > 0) {
						embed.addFields({ name: '🔄 統計', value: stats.join(' • '), inline: true });
					}
				}

				// Set footer
				embed.setFooter({ text: 'Powered by Civitai' });

				return {
					type: 'video_with_embed',
					embed: embed,
					videoUrl: mediaUrl,
				};
			}
			else {
				const filename = path.basename(mediaUrl);
				const embed = new EmbedBuilder()
					.setTitle(title)
					.setURL(url)
					.setColor('#00BFFF')
					.setImage(`attachment://${filename}`);

				if (description) {
					embed.setDescription(description);
				}

				// Add model type and stats if available
				if (data.type) {
					embed.addFields({ name: 'Type', value: data.type, inline: true });
				}

				if (data.stats) {
					const stats = [];
					if (data.stats.downloadCount) stats.push(`Downloads: ${data.stats.downloadCount.toLocaleString()}`);
					if (data.stats.thumbsUpCount) stats.push(`👍 ${data.stats.thumbsUpCount.toLocaleString()}`);
					if (stats.length > 0) {
						embed.addFields({ name: 'Stats', value: stats.join(' • '), inline: true });
					}
				}

				// Set footer
				embed.setFooter({ text: 'Powered by Civitai' });
				return { type: 'embeds', content: [embed], attachmentUrl: mediaUrl };
			}
		}
		catch (error) {
			console.error('Error processing Civitai URL via API:', error);
			return { type: 'fallback', content: `Failed to fetch Civitai model information: ${error.message}` };
		}
	}
}

module.exports = CivitaiService;