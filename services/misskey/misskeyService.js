const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

class MisskeyService {
	constructor() {
		this.name = 'Misskey';
		this.domains = ['misskey.io'];
		this.cache = new Map();
		this.cacheTimeout = 5 * 60 * 1000;
	}

	detectUrls(content) {
		const urlRegex = /https?:\/\/(?:www\.)?misskey\.io\/notes\/([a-zA-Z0-9]+)/g;
		const urls = [];
		let match;

		while ((match = urlRegex.exec(content)) !== null) {
			urls.push(match[0]);
		}

		return urls;
	}
	extractNoteId(url) {
		const match = url.match(/\/notes\/([a-zA-Z0-9]+)/);
		return match ? match[1] : null;
	}

	async fetchNoteData(noteId, retries = 2) {
		const cacheKey = `note_${noteId}`;
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const response = await axios.post('https://misskey.io/api/notes/show', {
					noteId: noteId,
				}, {
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'Discord Bot - Misskey Content Parser',
					},
					timeout: 15000 + (attempt * 5000),
					validateStatus: (status) => status < 500,
				});

				const data = response.data;

				if (data.error) {
					throw new Error(`Misskey API 錯誤: ${data.error.message || data.error.code}`);
				}

				this.cache.set(cacheKey, {
					data: data,
					timestamp: Date.now(),
				});

				return data;
			}
			catch (error) {
				console.error(`Misskey API 調用失敗 (嘗試 ${attempt + 1}/${retries + 1}):`, error.message);

				if (attempt === retries) {
					if (error.code === 'ECONNABORTED') {
						throw new Error('連接超時，請稍後再試');
					}
					else if (error.response?.status === 404) {
						throw new Error('筆記不存在或已被刪除');
					}
					else if (error.response?.status >= 500) {
						throw new Error('Misskey 服務器暫時不可用');
					}
					else {
						throw new Error(`無法獲取筆記信息: ${error.message}`);
					}
				}

				await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
			}
		}
	}

	formatInteractionStats(noteData) {
		const reactions = noteData.reactionCount || 0;
		const renotes = noteData.renoteCount || 0;
		const replies = noteData.repliesCount || 0;

		return `❤️ ${reactions} | 🔄 ${renotes} | 💬 ${replies}`;
	}

	formatTimestamp(createdAt) {
		const date = new Date(createdAt);
		return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
	}
	filterCustomEmojis(text) {
		if (!text) return text;

		const customEmojiRegex = /:[a-zA-Z0-9_]+(?:@[a-zA-Z0-9.-]+)?:/g;
		let filteredText = text.replace(customEmojiRegex, '');
		filteredText = filteredText.replace(/[ \t]+/g, ' ').trim();
		filteredText = filteredText.replace(/\n\s*\n\s*\n/g, '\n\n');

		return filteredText;
	}

	createEmbed(noteData, originalUrl) {
		const user = noteData.user;
		const embed = new EmbedBuilder()
			.setColor('#86b300')
			.setAuthor({
				name: `${user.name || user.username} (@${user.username})`,
				iconURL: user.avatarUrl,
				url: `https://misskey.io/@${user.username}`,
			})
			.setURL(originalUrl)
			.setFooter({
				text: 'Misskey.io',
				iconURL: 'https://media.misskeyusercontent.jp/io/3ca6f6f6-b4ba-4aea-b872-d4e2cb7d777b.png',
			})
			.setTimestamp(new Date(noteData.createdAt));

		if (noteData.text) {
			const filteredText = this.filterCustomEmojis(noteData.text);
			if (filteredText.trim()) {
				embed.setDescription(filteredText);
			}
		}

		if (noteData.files && noteData.files.length > 0) {
			const firstImage = noteData.files.find(file => file.type.startsWith('image/'));
			if (firstImage) {
				embed.setImage(firstImage.url);
			}
		}

		return embed;
	}

	async processUrl(url) {
		try {
			const noteId = this.extractNoteId(url);
			if (!noteId) {
				throw new Error('無法從 URL 中提取筆記 ID');
			}

			const noteData = await this.fetchNoteData(noteId);
			const embed = this.createEmbed(noteData, url);

			const additionalEmbeds = [];
			if (noteData.files && noteData.files.length > 1) {
				for (let i = 1; i < Math.min(noteData.files.length, 4); i++) {
					const file = noteData.files[i];
					if (file.type.startsWith('image/')) {
						const imageEmbed = new EmbedBuilder()
							.setColor('#86b300')
							.setImage(file.url);

						additionalEmbeds.push(imageEmbed);
					}
				}
			}

			return {
				type: 'embeds',
				content: [embed, ...additionalEmbeds],
			};
		}
		catch (error) {
			console.error('Error processing Misskey URL:', error);
			return {
				type: 'text',
				content: `❌ 無法處理 Misskey 連結: ${error.message}`,
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

module.exports = MisskeyService;
