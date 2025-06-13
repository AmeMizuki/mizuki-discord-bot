class RedditService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?reddit\.com\/[r|R]\/[a-zA-Z0-9_]+\/comments\/[a-zA-Z0-9_]+/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const convertedUrl = url.replace('reddit.com', 'vxreddit.com');
		return {
			type: 'fallback',
			content: convertedUrl,
		};
	}
}

module.exports = RedditService;