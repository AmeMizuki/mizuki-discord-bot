/**
 * Extracts the tweet ID from a Twitter/X URL.
 * @param {string} url The Twitter/X URL.
 * @returns {string|null} The tweet ID or null if not found.
 */
function getTweetIdFromUrl(url) {
	const match = url.match(/(?:twitter\.com|x\.com)\/\S+\/status\/(\d+)/);
	return match ? match[1] : null;
}

/**
 * Fetches tweet data from the FixTweet API.
 * @param {string} tweetId The ID of the tweet.
 * @returns {Promise<object|null>} The tweet data or null if an error occurs.
 */
async function fetchTweetData(tweetId) {
	const { default: fetch } = await import('node-fetch');
	try {
		const apiUrl = `https://api.fxtwitter.com/status/${tweetId}`;
		const response = await fetch(apiUrl);
		if (!response.ok) {
			console.error(`FixTweet API HTTP error! status: ${response.status} for URL: ${apiUrl}`);
			return null;
		}
		const data = await response.json();
		if (data.code !== 200) {
			console.error(`FixTweet API returned an error: ${data.message} for tweet ID: ${tweetId}`);
			return null;
		}
		return data.tweet;
	}
	catch (error) {
		console.error('Error fetching tweet data from FixTweet API:', error);
		return null;
	}
}

module.exports = {
	getTweetIdFromUrl,
	fetchTweetData,
};