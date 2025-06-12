class BilibiliService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?bilibili\.com\/video\/[a-zA-Z0-9_]+/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const convertedUrl = url.replace('bilibili.com', 'vxbilibili.com');
		return {
			type: 'fallback',
			content: convertedUrl,
		};
	}
}

module.exports = BilibiliService;