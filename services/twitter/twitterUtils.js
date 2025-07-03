function getTweetIdFromUrl(url) {
	const match = url.match(/(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/);
	return match ? match[1] : null;
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
		} else if (item.type === 'video' || item.type === 'gif') {
			videos.push({
				url: item.url,
				thumbnail_url: item.thumbnail_url || null,
				width: item.width || null,
				height: item.height || null,
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

async function fetchTweetData(tweetId) {
	const { default: fetch } = await import('node-fetch');

	try {
		const fxApiUrl = `https://api.fxtwitter.com/status/${tweetId}`;
		const fxResponse = await fetch(fxApiUrl, { timeout: 5000 });

		if (fxResponse.ok) {
			const fxData = await fxResponse.json();
			if (fxData.code === 200) {
				console.log(`Successfully fetched tweet data from Fxtwitter API for tweet ID: ${tweetId}`);
				return fxData.tweet;
			}
			console.warn(`Fxtwitter API returned error code ${fxData.code}: ${fxData.message} for tweet ID: ${tweetId}`);
		} else {
			console.warn(`Fxtwitter API HTTP error! status: ${fxResponse.status} for tweet ID: ${tweetId}`);
		}
	}
	catch (error) {
		console.warn('Fxtwitter API failed, trying vxtwitter as backup:', error.message);
	}

	try {
		const vxApiUrl = `https://api.vxtwitter.com/i/status/${tweetId}`;
		const vxResponse = await fetch(vxApiUrl, { timeout: 5000 });

		if (!vxResponse.ok) {
			console.error(`Vxtwitter API HTTP error! status: ${vxResponse.status} for tweet ID: ${tweetId}`);
			return null;
		}

		const contentType = vxResponse.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			console.error(`Vxtwitter API returned non-JSON response for tweet ID: ${tweetId}`);
			return null;
		}

		const vxData = await vxResponse.json();

		if (vxData.error || !vxData.user_screen_name) {
			console.error(`Vxtwitter API returned invalid data for tweet ID: ${tweetId}`);
			return null;
		}

		const convertedData = convertVxTwitterData(vxData);
		console.log(`Successfully fetched tweet data from Vxtwitter API (backup) for tweet ID: ${tweetId}`);
		return convertedData;
	}
	catch (error) {
		console.error('Error fetching tweet data from both Fxtwitter and Vxtwitter APIs:', error.message);
		return null;
	}
}

module.exports = {
	getTweetIdFromUrl,
	fetchTweetData,
	convertVxTwitterData,
};