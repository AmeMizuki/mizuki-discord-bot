const axios = require('axios');

class PixivService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?pixiv\.net\/(?:en\/)?artworks\/(\d+)/g;
		this.idRegex = /https?:\/\/(?:www\.)?pixiv\.net\/(?:en\/)?artworks\/(\d+)/;
	}

	detectUrls(content) {
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const idMatch = url.match(this.idRegex);
		if (!idMatch) {
			return this.fallback(url);
		}
		const artworkId = idMatch[1];

		try {
			const illustResponse = await axios.get(`https://www.pixiv.net/ajax/illust/${artworkId}`, {
				headers: {
					'Referer': `https://www.pixiv.net/artworks/${artworkId}`,
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
				},
			});

			const illustData = illustResponse.data.body;

			// Type 2 is Ugoira (GIF)
			if (illustData.illustType === 2) {
				return this.fallback(url);
			}

			// Type 0 (illust) and 1 (manga)
			const pagesResponse = await axios.get(`https://www.pixiv.net/ajax/illust/${artworkId}/pages`, {
				headers: {
					'Referer': `https://www.pixiv.net/artworks/${artworkId}`,
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
				},
			});
			const pages = pagesResponse.data.body;

			const imageUrls = pages.map(page => (page.urls.regular || page.urls.original).replace('i.pximg.net', 'i.pixiv.re'));

			const pageCount = illustData.pageCount > 0 ? illustData.pageCount : 1;
			if (pageCount === 1 && imageUrls.length === 0) {
				imageUrls.push(illustData.urls.original.replace('i.pximg.net', 'i.pixiv.re'));
			}

			return {
				type: 'pixiv_embed',
				data: {
					title: illustData.title,
					description: illustData.description,
					author: illustData.userName,
					authorUrl: `https://www.pixiv.net/users/${illustData.userId}`,
					url: url,
					imageUrls: imageUrls,
					pageCount: pageCount,
					bookmarkCount: illustData.bookmarkCount,
				},
			};
		}
		catch (error) {
			console.error('Pixiv API error:', error);
			return this.fallback(url);
		}
	}

	fallback(url) {
		const convertedUrl = url.replace('pixiv.net', 'phixiv.net');
		return {
			type: 'fallback',
			content: convertedUrl,
		};
	}
}

module.exports = PixivService;