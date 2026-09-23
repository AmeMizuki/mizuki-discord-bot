const { getTweetIdFromUrl, parseTweetUrl, fetchTweetData } = require('./twitterUtils');
const { createTweetEmbed } = require('../../utils/embedBuilder');

class TwitterService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/gi;
	}

	detectUrls(content) {
		return content.match(this.urlRegex) || [];
	}

	async processUrl(url) {
		const tweetId = getTweetIdFromUrl(url);
		if (!tweetId) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Invalid link format'),
			};
		}

		const tweetResult = await fetchTweetData(tweetId);
		if (!tweetResult) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Failed to get detailed information', 'fixupx'),
			};
		}

		const { data: tweetData, source } = tweetResult;

		if (!tweetData) {
			return {
				type: 'fallback',
				content: this.createFallbackLink(url, 'Failed to get detailed information', source),
			};
		}

		// GIFs embed fixupx's animated WebP; videos (or a failed GIF probe) link the raw video.twimg.com file above a text embed
		if (tweetData.media && tweetData.media.videos && tweetData.media.videos.length > 0) {
			const isGif = tweetData.media.videos.every(video => video.type === 'gif');

			if (isGif) {
				const gifUrl = await this.getAnimatedPreviewUrl(url);
				if (gifUrl) {
					return {
						type: 'embeds',
						content: await createTweetEmbed(tweetData, url, [gifUrl]),
					};
				}
			}

			return {
				type: 'embeds',
				text: tweetData.media.videos.filter(video => video.url).map(video => `[Preview](${video.url})`).join('\n'),
				content: await createTweetEmbed(tweetData, url),
			};
		}

		// Handle photos
		if (tweetData.media && tweetData.media.photos && tweetData.media.photos.length > 0) {
			const imageUrls = tweetData.media.photos.map(p => p.url);
			const embeds = await createTweetEmbed(tweetData, url, imageUrls);
			return {
				type: 'embeds',
				content: embeds,
			};
		}

		// Handle text-only tweets
		const embeds = await createTweetEmbed(tweetData, url);
		return {
			type: 'embeds',
			content: embeds,
		};
	}

	createFallbackLink(originalUrl, reason = '', source = 'fixupx') {
		const domain = source === 'vxtwitter' ? 'fixvx.com' : 'fixupx.com';
		const convertedLink = originalUrl.replace(/(twitter\.com|x\.com)/, domain);

		const reasonText = reason ? ` (${reason})` : '';
		return `\n${convertedLink}${reasonText}`;
	}

	// fixupx serves an animated WebP for GIF posts; returns its final URL or null
	async getAnimatedPreviewUrl(originalUrl) {
		const tweet = parseTweetUrl(originalUrl);
		if (!tweet) {
			return null;
		}

		const previewUrl = `https://d.fixupx.com/${tweet.screenName || 'i'}/status/${tweet.tweetId}`;

		try {
			const { default: fetch } = await import('node-fetch');
			const response = await fetch(previewUrl, {
				timeout: 5000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
					Range: 'bytes=0-127',
				},
			});

			if (!response.ok) {
				return null;
			}

			const contentType = response.headers.get('content-type') || '';
			if (!contentType.includes('webp')) {
				return null;
			}

			const header = Buffer.from(await response.arrayBuffer());
			return TwitterService.isAnimatedWebp(header) ? response.url : null;
		}
		catch (error) {
			console.warn(`Fixupx animated preview probe failed, falling back to vxtwitter: ${error.message}`);
			return null;
		}
	}

	// A WebP is only animated when it carries an ANIM chunk; a still WebP means
	// fixupx's transcoded preview failed and Discord would not animate it.
	static isAnimatedWebp(bytes) {
		return bytes.length >= 12
			&& bytes.subarray(0, 4).toString('latin1') === 'RIFF'
			&& bytes.subarray(8, 12).toString('latin1') === 'WEBP'
			&& bytes.includes('ANIM');
	}
}

module.exports = TwitterService;