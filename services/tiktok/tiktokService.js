const { fetchOgEmbed } = require('../../utils/embedBuilder');

class TiktokService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/\S+/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const convertedUrl = url.replace('tiktok.com', 'tnktok.com');

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

module.exports = TiktokService;
