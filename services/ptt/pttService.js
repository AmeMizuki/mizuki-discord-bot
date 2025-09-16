const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');

const SUPPORTED_BOARDS = ['Gossiping', 'C_Chat', 'Beauty', 'movie', 'Stock', 'Baseball', 'NBA', 'LoL', 'PC_Shopping'];

class PttService {
	constructor() {
		this.name = 'PTT';
		const boardsRegexPart = SUPPORTED_BOARDS.join('|');
		this.urlRegex = new RegExp(`https?://www\\.ptt\\.cc/bbs/(${boardsRegexPart})/M\\.\\d+\\.A\\.[A-Z0-9]+\\.html`, 'g');
		this.cache = new Map();
		this.cacheTimeout = 10 * 60 * 1000;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	extractFirstImage(text) {
		const pattern = /https:\/\/.*\.(jpg|jpeg|png|gif|webp)/;
		const result = text.match(pattern);
		if (result && result.length > 0) {
			return result[0];
		}
		return null;
	}

	cleanContent(text) {
		if (!text) return '';

		return text
			.replace(/^※.*$/gm, '')
			.replace(/^\s*[\r\n]/gm, '')
			.trim()
			.substring(0, 160);
	}

	extractImages(content) {
		const imageUrls = [];

		const imageRegexes = [
			/https?:\/\/(?:i\.)?imgur\.com\/[a-zA-Z0-9]+\.(?:jpg|jpeg|png|gif|webp)/gi,
			/https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s)]*)?/gi,
			/https?:\/\/[^\s)]*ptt[^\s)]*\.(?:jpg|jpeg|png|gif|webp)/gi,
		];

		imageRegexes.forEach(regex => {
			let match;
			while ((match = regex.exec(content)) !== null) {
				const url = match[0].replace(/[.,)]*$/, '');
				if (!imageUrls.includes(url)) {
					imageUrls.push(url);
				}
			}
		});

		return imageUrls.slice(0, 4);
	}

	async processUrl(url) {
		const cacheKey = `ptt_${url}`;
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		try {
			const response = await axios.get(url, {
				headers: {
					'Host': 'www.ptt.cc',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3',
					'Accept-Encoding': 'gzip, deflate, br, zstd',
					'Referer': 'https://www.ptt.cc/bbs/Gossiping/search',
					'Connection': 'keep-alive',
					'Cookie': 'over18=1;',
					'Upgrade-Insecure-Requests': '1',
					'Sec-Fetch-Dest': 'document',
					'Sec-Fetch-Mode': 'navigate',
					'Sec-Fetch-Site': 'same-origin',
					'Sec-Fetch-User': '?1',
					'Priority': 'u=0, i',
				},
				timeout: 20000,
				maxRedirects: 5,
				maxContentLength: 2 * 1024 * 1024,
   			maxBodyLength: 2 * 1024 * 1024,
				validateStatus: (status) => status < 400,
			});

			const $ = cheerio.load(response.data);

			// 提取基本資訊
			const title = $('meta[property="og:title"]').attr('content') ||
						  $('.article-meta-value').eq(2).text().trim() ||
						  'PTT 文章';

			const description = $('meta[property="og:description"]').attr('content') || '';

			// 提取文章內容
			const mainContent = $('#main-content').text().substring(0, 1000) || '';

			let finalDescription = '';
			if (description.match(/1\.媒體來源:/)) {
				// 新聞文章，使用清理後的內容
				const cleanedContent = this.cleanContent(mainContent);
				if (cleanedContent) {
					finalDescription = cleanedContent;
				}
				else if (description) {
					finalDescription = description;
				}
			}
			else if (description) {
				finalDescription = description;
			}

			// 提取第一張圖片
			const firstImage = this.extractFirstImage(mainContent);

			const embed = new EmbedBuilder()
				.setColor(0x61FFCA)
				.setTitle(title)
				.setURL(url)
				.setFooter({
					text: 'PTT 批踢踢實業坊',
				});

			// 設置描述
			if (finalDescription) {
				embed.setDescription(finalDescription);
			}

			// 設置第一張圖片
			if (firstImage) {
				embed.setImage(firstImage);
			}

			const result = {
				type: 'embeds',
				content: [embed],
			};

			// 緩存結果
			this.cache.set(cacheKey, {
				data: result,
				timestamp: Date.now(),
			});

			return result;

		}
		catch (error) {
			console.error('PTT service error:', error.message);
			return {
				type: 'fallback',
				content: url,
			};
		}
	}

	cleanCache() {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (now - value.timestamp > this.cacheTimeout) {
				this.cache.delete(key);
			}
		}
	}
}

module.exports = PttService;