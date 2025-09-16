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
					'Cookie': 'over18=1;',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				},
				timeout: 15000,
			});

			const $ = cheerio.load(response.data);

			// 提取文章標題
			const title = $('.article-meta-value').eq(2).text().trim() ||
						  $('meta[property="og:title"]').attr('content') ||
						  'PTT 文章';

			// 提取作者信息
			const author = $('.article-meta-value').eq(0).text().trim() || '未知作者';

			// 提取發布時間
			const dateStr = $('.article-meta-value').eq(3).text().trim();
			let publishDate = null;
			if (dateStr) {
				publishDate = new Date(dateStr);
			}

			// 提取文章內容
			let content = '';
			const mainContent = $('#main-content');

			// 移除推文區域
			mainContent.find('.push').remove();

			// 獲取純文字內容
			content = mainContent.text().trim();

			// 清理內容：移除作者資訊行和多餘空白
			const lines = content.split('\n');
			const cleanLines = lines.filter(line => {
				const trimmed = line.trim();
				return trimmed &&
					   !trimmed.startsWith('※') &&
					   !trimmed.startsWith('--') &&
					   !trimmed.match(/^作者\s+/) &&
					   !trimmed.match(/^標題\s+/) &&
					   !trimmed.match(/^時間\s+/);
			});

			content = cleanLines.join('\n').trim();

			// 限制內容長度
			if (content.length > 1000) {
				content = content.substring(0, 1000) + '...';
			}

			// 提取圖片
			const fullContent = mainContent.html() || '';
			const imageUrls = this.extractImages(fullContent);

			// 創建主要 Embed
			const embed = new EmbedBuilder()
				.setColor(0x61FFCA)
				.setTitle(title)
				.setURL(url)
				.setAuthor({
					name: `${author}`,
				})
				.setFooter({
					text: 'PTT 批踢踢實業坊',
				});

			if (publishDate && !isNaN(publishDate.getTime())) {
				embed.setTimestamp(publishDate);
			}

			if (content) {
				embed.setDescription(content);
			}

			// 設置第一張圖片
			if (imageUrls.length > 0) {
				embed.setImage(imageUrls[0]);
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
			console.error(`Failed to process PTT URL ${url}:`, error);

			let errorMessage = '無法預覽 PTT 文章';
			if (error.code === 'ECONNABORTED') {
				errorMessage = 'PTT 連接超時，請稍後再試';
			}
			else if (error.response?.status === 404) {
				errorMessage = 'PTT 文章不存在或已被刪除';
			}
			else if (error.response?.status === 403) {
				errorMessage = 'PTT 文章無法訪問（可能需要登入）';
			}

			return {
				type: 'text',
				content: `❌ ${errorMessage}: ${url}`,
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