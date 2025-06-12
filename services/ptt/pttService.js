const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');

// To add more PTT boards
const SUPPORTED_BOARDS = ['Gossiping', 'C_Chat'];

class PttService {
	constructor() {
		const boardsRegexPart = SUPPORTED_BOARDS.join('|');
		this.urlRegex = new RegExp(`https?://www\\.ptt\\.cc/bbs/(${boardsRegexPart})/M\\.\\d+\\.A\\.[A-Z0-9]+\\.html`, 'g');
	}
	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}
	async processUrl(url) {
		try {
			const response = await axios.get(url, {
				headers: { Cookie: 'over18=1;' },
			});
			const $ = cheerio.load(response.data);

			const title = $('meta[property="og:title"]').attr('content') || 'PTT Article';
			let description = $('meta[property="og:description"]').attr('content') || '';

			if (description.length > 300) {
				description = description.substring(0, 300) + '...';
			}

			// Find first image in the main content
			const mainContent = $('#main-content').text();
			const imageRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/;
			const imageMatch = mainContent.match(imageRegex);
			const imageUrl = imageMatch ? imageMatch[0] : null;

			const embed = new EmbedBuilder()
				.setColor(0x61FFCA)
				.setTitle(title)
				.setURL(url)
				.setDescription(description)
				.setTimestamp()
				.setFooter({ text: 'Powered by PTT' });

			if (imageUrl) {
				embed.setImage(imageUrl);
			}

			return {
				type: 'embeds',
				content: [embed],
			};
		}
		catch (error) {
			console.error(`Failed to process PTT URL ${url}:`, error);
			return {
				type: 'fallback',
				content: `無法預覽 PTT 文章，但這是連結： ${url}`,
			};
		}
	}
}

module.exports = PttService;