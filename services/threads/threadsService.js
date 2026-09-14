const { createThreadsEmbed } = require('../../utils/embedBuilder');

const FX_DOMAIN = 'fx.akitsuki.me';

class ThreadsService {
	constructor() {
		this.urlRegex = /https?:\/\/(?:www\.)?threads\.(?:net|com)\/\S+/g;
	}

	detectUrls(content) {
		this.urlRegex.lastIndex = 0;
		return content.match(this.urlRegex) || [];
	}

	// FxThreads routes /@user/post/:id and /t/:id through the same post lookup,
	// while /share/:id (the newer share-sheet format) needs its own endpoint.
	parseThreadsUrl(url) {
		const shareMatch = url.match(/threads\.(?:net|com)\/share\/([a-zA-Z0-9_-]+)/i);
		if (shareMatch) {
			return { kind: 'share', id: shareMatch[1] };
		}

		const postMatch = url.match(/threads\.(?:net|com)\/(?:@[^/]+\/post|t)\/([a-zA-Z0-9_-]+)/i);
		if (postMatch) {
			return { kind: 'post', id: postMatch[1] };
		}

		return null;
	}

	createFallbackLink(originalUrl) {
		return originalUrl.replace(/threads\.(?:net|com)/, FX_DOMAIN);
	}

	async fetchPost(parsed) {
		const { default: fetch } = await import('node-fetch');
		const apiUrl = parsed.kind === 'share'
			? `https://${FX_DOMAIN}/api/share/${parsed.id}`
			: `https://${FX_DOMAIN}/api/post/${parsed.id}`;

		try {
			// FxThreads drives a headless browser to scrape the post, so give it
			// more room than a plain API call before treating it as down.
			const response = await fetch(apiUrl, { timeout: 15000 });
			if (!response.ok) {
				return null;
			}
			return await response.json();
		}
		catch (error) {
			console.warn(`FxThreads API failed for ${parsed.id}: ${error.message}`);
			return null;
		}
	}

	async processUrl(url) {
		const parsed = this.parseThreadsUrl(url);
		if (!parsed) {
			return { type: 'fallback', content: this.createFallbackLink(url) };
		}

		const post = await this.fetchPost(parsed);
		if (!post || !post.author) {
			return { type: 'fallback', content: this.createFallbackLink(url) };
		}

		// ponytail: mixed video carousels fall back to the plain link since a
		// manually built embed can't autoplay video; upgrade if that's ever needed.
		const hasVideo = (post.medias || []).some(media => media.is_video);
		if (hasVideo) {
			return { type: 'fallback', content: this.createFallbackLink(url) };
		}

		const imageUrls = (post.medias || []).map(media => media.url).filter(Boolean);
		const embeds = await createThreadsEmbed(post, url, imageUrls);
		return { type: 'embeds', content: embeds };
	}
}

module.exports = ThreadsService;
