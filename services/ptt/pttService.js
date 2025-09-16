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
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
					'Accept-Encoding': 'gzip, deflate, br',
					'Connection': 'keep-alive',
					'Upgrade-Insecure-Requests': '1',
				},
				timeout: 20000,
				maxRedirects: 5,
				validateStatus: (status) => status < 400,
			});

			const $ = cheerio.load(response.data);

			// 優化的文章資訊提取邏輯
			let title = '';
			let author = '';
			let publishDate = null;

			// 嘗試多種方式提取標題
			title = $('.article-meta-value').eq(2).text().trim() ||
					$('.article-meta-tag:contains("標題")').next('.article-meta-value').text().trim() ||
					$('meta[property="og:title"]').attr('content') ||
					$('title').text().replace(' - 批踢踢實業坊', '').trim() ||
					'PTT 文章';

			// 嘗試多種方式提取作者
			author = $('.article-meta-value').eq(0).text().trim() ||
					 $('.article-meta-tag:contains("作者")').next('.article-meta-value').text().trim() ||
					 '未知作者';

			// 嘗試多種方式提取發布時間
			const dateStr = $('.article-meta-value').eq(3).text().trim() ||
							$('.article-meta-tag:contains("時間")').next('.article-meta-value').text().trim();

			if (dateStr) {
				try {
					publishDate = new Date(dateStr);
					// 檢查日期是否有效
					if (isNaN(publishDate.getTime())) {
						publishDate = null;
					}
				}
				catch (error) {
					console.warn('Failed to parse date:', error);
					publishDate = null;
				}
			}

			// 優化的文章內容提取邏輯
			let content = '';
			const mainContent = $('#main-content');

			if (mainContent.length > 0) {
				// 創建內容副本以避免修改原始 DOM
				const contentClone = mainContent.clone();

				// 移除推文區域和其他不需要的元素
				contentClone.find('.push').remove();
				contentClone.find('.article-metaline').remove();
				contentClone.find('.article-meta-tag').remove();
				contentClone.find('.article-meta-value').remove();

				// 獲取純文字內容
				content = contentClone.text().trim();

				// 更精確的內容清理
				const lines = content.split('\n');
				const cleanLines = lines.filter(line => {
					const trimmed = line.trim();
					return trimmed &&
						   !trimmed.startsWith('※') &&
						   !trimmed.startsWith('--') &&
						   !trimmed.match(/^作者[\s:：]+/) &&
						   !trimmed.match(/^標題[\s:：]+/) &&
						   !trimmed.match(/^時間[\s:：]+/) &&
						   !trimmed.match(/^看板[\s:：]+/) &&
						   !trimmed.match(/^\s*$/) &&
						   trimmed.length > 1;
				});

				content = cleanLines.join('\n').trim();

				// 移除連續的空行
				content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
			}

			// 如果沒有提取到內容，嘗試從 meta 標籤獲取
			if (!content) {
				content = $('meta[property="og:description"]').attr('content') || '';
			}

			// 限制內容長度
			if (content.length > 1000) {
				content = content.substring(0, 1000) + '...';
			}

			let imageUrls = [];

			// 從文章內容中提取圖片
			const fullContent = mainContent.html() || '';
			if (fullContent) {
				imageUrls = this.extractImages(fullContent);
			}

			// 如果沒有找到圖片，嘗試從整個頁面提取
			if (imageUrls.length === 0) {
				const pageContent = $('body').html() || '';
				imageUrls = this.extractImages(pageContent);
			}

			// 過濾掉無效的圖片 URL
			imageUrls = imageUrls.filter(imageUrl => {
				try {
					new URL(imageUrl);
					return true;
				}
				catch {
					return false;
				}
			});

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
			console.error('Error processing PTT URL:', error);

			let errorMessage = '無法預覽 PTT 文章';

			// 更詳細的錯誤處理
			if (error.code === 'ECONNABORTED') {
				errorMessage = 'PTT 連接超時，請稍後再試';
			}
			else if (error.response?.status === 404) {
				errorMessage = 'PTT 文章不存在或已被刪除';
			}

			return {
				type: 'text',
				content: `❌ ${errorMessage}`,
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