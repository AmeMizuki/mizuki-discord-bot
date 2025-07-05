const Parser = require('rss-parser');

class YouTubeService {
	constructor() {
		this.parser = new Parser();
	}

	async fetchLatestVideo(channelId) {
		try {
			const feed = await this.parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
			if (feed.items.length === 0) {
				return null;
			}
			return feed.items[0];
		}
		catch (error) {
			console.error(`Error fetching YouTube feed for channel ${channelId}:`, error);
			return null;
		}
	}
}

module.exports = YouTubeService;