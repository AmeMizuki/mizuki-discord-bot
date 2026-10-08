const { EmbedBuilder } = require('discord.js');
const { createTranslatedTweetEmbed } = require('../../utils/embedBuilder');

// Matches twitter.com/x.com and their FxEmbed mirrors, with or without a handle
// (`/user/status/1`, `/i/web/status/1`, `/status/1`, `/user/status/1/ja`).
const TWEET_URL_REGEX = /(?:twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com|fixvx\.com|twittpr\.com)((?:\/[^/?#]+)*)\/(?:status|statuses)\/(\d+)/i;

function parseTweetUrl(url) {
	const match = url.match(TWEET_URL_REGEX);
	if (!match) {
		return null;
	}

	const handle = match[1].split('/').filter(segment => segment && segment !== 'i' && segment !== 'web').pop();

	return { screenName: handle || null, tweetId: match[2] };
}

function getTweetIdFromUrl(url) {
	const parsed = parseTweetUrl(url);
	return parsed ? parsed.tweetId : null;
}

function buildTranslatedTweetUrl(tweet, language) {
	return `https://fixupx.com/${tweet.screenName || 'i'}/status/${tweet.tweetId}/${language}`;
}

function convertVxTwitterData(vxData) {
	return {
		id: vxData.id || null,
		url: vxData.tweetURL || null,
		text: vxData.text || null,
		author: {
			id: vxData.user_id || null,
			name: vxData.user_name || null,
			screen_name: vxData.user_screen_name || null,
			avatar_url: vxData.user_profile_image_url || null,
		},
		created_timestamp: vxData.date_epoch || null,
		likes: vxData.likes || 0,
		retweets: vxData.retweets || 0,
		replies: vxData.replies || 0,
		views: vxData.views || null,
		color: vxData.color || null,
		media: convertVxTwitterMedia(vxData.media_extended),
	};
}

function convertVxTwitterMedia(mediaExtended) {
	if (!mediaExtended || !Array.isArray(mediaExtended)) {
		return null;
	}

	const photos = [];
	const videos = [];

	mediaExtended.forEach(item => {
		if (item.type === 'image') {
			photos.push({
				url: item.url,
				width: item.width || null,
				height: item.height || null,
			});
		}
		else if (item.type === 'video' || item.type === 'gif') {
			videos.push({
				url: item.url,
				thumbnail_url: item.thumbnail_url || null,
				width: item.width || null,
				height: item.height || null,
				type: item.type,
			});
		}
	});

	const media = {};
	if (photos.length > 0) {
		media.photos = photos;
	}
	if (videos.length > 0) {
		media.videos = videos;
	}

	return Object.keys(media).length > 0 ? media : null;
}

async function fetchTranslatedTweet(tweetId, language) {
	const { default: fetch } = await import('node-fetch');

	try {
		const response = await fetch(`https://api.fxtwitter.com/status/${tweetId}/${language}`, { timeout: 7000 });
		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data.code === 200 ? data.tweet : null;
	}
	catch (error) {
		console.warn(`Failed to fetch translated tweet ${tweetId}: ${error.message}`);
		return null;
	}
}

// fixupx serves an animated WebP for GIF posts; returns its final URL or null.
async function getAnimatedPreviewUrl(originalUrl) {
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
		if (!response.ok || !(response.headers.get('content-type') || '').includes('webp')) {
			return null;
		}
		const header = Buffer.from(await response.arrayBuffer());
		return isAnimatedWebp(header) ? response.url : null;
	}
	catch (error) {
		console.warn(`Fixupx animated preview probe failed, falling back to video: ${error.message}`);
		return null;
	}
}

// A still WebP means fixupx's animated preview failed.
function isAnimatedWebp(bytes) {
	return bytes.length >= 12
		&& bytes.subarray(0, 4).toString('latin1') === 'RIFF'
		&& bytes.subarray(8, 12).toString('latin1') === 'WEBP'
		&& bytes.includes('ANIM');
}

// Translation text stays in the first embed; animations use images before falling back to Preview links.
async function buildTranslatedTweetMessage(tweetId, language) {
	const translatedTweet = await fetchTranslatedTweet(tweetId, language);
	const translatedText = translatedTweet?.translation?.text;
	if (!translatedText) {
		return null;
	}

	let quote = translatedTweet.quote;
	if (quote?.url && !quote.translation?.text) {
		const quoteId = quote.id || getTweetIdFromUrl(quote.url);
		if (quoteId) {
			const translatedQuote = await fetchTranslatedTweet(quoteId, language);
			if (translatedQuote?.translation?.text) {
				quote = { ...quote, translation: translatedQuote.translation };
			}
		}
	}
	if (quote?.translation?.text) {
		quote = { ...quote, text: quote.translation.text };
	}

	const embed = await createTranslatedTweetEmbed({ ...translatedTweet, text: translatedText }, translatedTweet.url, quote);
	const embeds = [embed];
	let firstPhoto = true;
	const videoLinks = [];
	for (const [tweet, url] of [[translatedTweet, translatedTweet.url], [quote, quote?.url || translatedTweet.url]]) {
		const imageUrls = (tweet?.media?.photos || []).map(photo => photo.url);
		let seenGif = false;
		for (const video of tweet?.media?.videos || []) {
			const isGif = video.type === 'gif' || video.type === 'animated_gif';
			const firstGif = !seenGif;
			if (isGif) seenGif = true;
			if (!video.url) continue;
			let imageUrl = /\.(?:gif|webp)(?:[?#]|$)/i.test(video.url) ? video.url : null;
			if (!imageUrl && firstGif && isGif) {
				// ponytail: tweet-level preview covers the first GIF; use per-media previews if available.
				imageUrl = await getAnimatedPreviewUrl(url);
			}
			if (imageUrl) imageUrls.push(imageUrl);
			else videoLinks.push(`[Preview](${video.url})`);
		}
		for (const imageUrl of imageUrls) {
			const imageEmbed = firstPhoto ? embed : new EmbedBuilder().setColor(embed.data.color);
			imageEmbed.setImage(imageUrl).setURL(url);
			if (!firstPhoto) embeds.push(imageEmbed);
			firstPhoto = false;
		}
	}
	return { text: videoLinks.join('\n') || undefined, embeds };
}

async function fetchTweetData(tweetId) {
	const { default: fetch } = await import('node-fetch');

	try {
		const fxApiUrl = `https://api.fxtwitter.com/status/${tweetId}`;
		const fxResponse = await fetch(fxApiUrl, { timeout: 5000 });

		if (fxResponse.ok) {
			const fxData = await fxResponse.json();
			if (fxData.code === 200) {
				const tweet = fxData.tweet;
				if (
					tweet.media &&
					tweet.media.videos &&
					tweet.media.videos.length > 0 &&
					!tweet.media.videos[0].url
				) {
					console.warn(`Fxtwitter API failed to provide video URL for tweet ID: ${tweetId}. Trying vxtwitter.`);
					throw new Error('Fxtwitter video link is missing');
				}
				return { data: tweet, source: 'fxtwitter' };
			}
			console.warn(`Fxtwitter API returned error code ${fxData.code}: ${fxData.message} for tweet ID: ${tweetId}`);
		}
		else {
			console.warn(`Fxtwitter API HTTP error! status: ${fxResponse.status} for tweet ID: ${tweetId}`);
		}
	}
	catch (error) {
		console.warn(`Fxtwitter API failed, trying vxtwitter as backup: ${error.message}`);
	}

	try {
		const vxApiUrl = `https://api.vxtwitter.com/i/status/${tweetId}`;
		const vxResponse = await fetch(vxApiUrl, { timeout: 5000 });

		if (!vxResponse.ok) {
			console.error(`Vxtwitter API HTTP error! status: ${vxResponse.status} for tweet ID: ${tweetId}`);
			return { data: null, source: 'vxtwitter' };
		}

		const contentType = vxResponse.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			console.error(`Vxtwitter API returned non-JSON response for tweet ID: ${tweetId}`);
			return { data: null, source: 'vxtwitter' };
		}

		const vxData = await vxResponse.json();

		if (vxData.error || !vxData.user_screen_name) {
			console.error(`Vxtwitter API returned invalid data for tweet ID: ${tweetId}`);
			return { data: null, source: 'vxtwitter' };
		}

		const convertedData = convertVxTwitterData(vxData);
		// console.log(`Successfully fetched tweet data from Vxtwitter API (backup) for tweet ID: ${tweetId}`);
		return { data: convertedData, source: 'vxtwitter' };
	}
	catch (error) {
		console.error('Error fetching tweet data from both Fxtwitter and Vxtwitter APIs:', error.message);
		return null;
	}
}

module.exports = {
	getTweetIdFromUrl,
	parseTweetUrl,
	buildTranslatedTweetUrl,
	fetchTweetData,
	buildTranslatedTweetMessage,
	getAnimatedPreviewUrl,
	convertVxTwitterData,
};