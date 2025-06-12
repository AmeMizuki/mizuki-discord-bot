class PixivService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?pixiv\.net\/(?:en\/)?artworks\/(\d+)/g;
	}

	detectUrls(content) {
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const convertedUrl = url.replace('pixiv.net', 'phixiv.net');
		return {
			type: 'fallback',
			content: convertedUrl,
		};
	}
}

module.exports = PixivService;