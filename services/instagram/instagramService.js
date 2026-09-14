const { fetchOgEmbed } = require('../../utils/embedBuilder');

class InstagramService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?instagram\.com\/\S+/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const primaryUrl = url.replace('instagram.com', 'oginstagram.com');
		const fallbackUrl = url.replace('instagram.com', 'zzinstagram.com');
		const chosenUrl = (await this.isReachable(primaryUrl)) ? primaryUrl : fallbackUrl;

		const embed = await fetchOgEmbed(chosenUrl);
		if (embed) {
			return { type: 'embeds', content: [embed] };
		}

		return { type: 'fallback', content: chosenUrl };
	}

	// oginstagram gives the richer embed; probe it first so a downed primary
	// doesn't silently produce a broken embed, and fall back to zzinstagram.
	async isReachable(url) {
		try {
			const { default: fetch } = await import('node-fetch');
			const response = await fetch(url, {
				method: 'HEAD',
				timeout: 5000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
				},
			});
			return response.ok;
		}
		catch (error) {
			console.warn(`OGInstagram probe failed, falling back to zzinstagram: ${error.message}`);
			return false;
		}
	}
}

module.exports = InstagramService;
