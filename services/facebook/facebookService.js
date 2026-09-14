const { fetchOgEmbed } = require('../../utils/embedBuilder');

class FacebookService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?facebook\.com\/\S+/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const convertedUrl = url.replace(/(?:www\.)?facebook\.com/, 'facebed.com');

		const embed = await fetchOgEmbed(convertedUrl);
		if (embed) {
			return { type: 'embeds', content: [embed] };
		}

		return {
			type: 'fallback',
			content: convertedUrl,
		};
	}
}

module.exports = FacebookService;
