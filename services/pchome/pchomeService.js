const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');

class PchomeService {
	detectUrls(text) {
		const regex = /https?:\/\/24h\.pchome\.com\.tw\/prod\/[A-Za-z0-9_-]+/g;
		return text.match(regex) || [];
	}

	async processUrl(url) {
		try {
			const { data } = await axios.get(url);
			const $ = cheerio.load(data);

			const title = $('meta[property="og:title"]').attr('content') || $('h1#prod_name').text();
			const imageUrl = $('meta[property="og:image"]').attr('content');

			// Extract product ID from URL for API call
			let sloganText = '';
			let priceDisplay = 'N/A';

			const match = url.match(/https?:\/\/24h\.pchome\.com\.tw\/prod\/([A-Za-z0-9_-]+)/);
			if (match) {
				const pcid = match[1];
				try {
					// First API call to get price information
					const priceApiUrl = `https://ecapi-cdn.pchome.com.tw/ecshop/prodapi/v2/prod/${pcid}&fields=Name,Nick,Price,Pic&_callback=jsonp_prod&2837602?_callback=jsonp_prod`;
					const priceResp = await axios.get(priceApiUrl, { timeout: 2500 });

					if (priceResp.status === 200) {
						// Parse current price and original price
						const currentPriceMatch = priceResp.data.match(/"P":(\d+)/);
						const originalPriceMatch = priceResp.data.match(/"M":(\d+)/);

						if (currentPriceMatch) {
							const currentPrice = parseInt(currentPriceMatch[1]);
							const originalPrice = originalPriceMatch ? parseInt(originalPriceMatch[1]) : null;

							if (originalPrice && originalPrice > currentPrice) {
								// There's a discount
								priceDisplay = `~~NT$ ${originalPrice.toLocaleString()}~~ **NT$ ${currentPrice.toLocaleString()}**`;
							}
							else {
								// No discount
								priceDisplay = `NT$ ${currentPrice.toLocaleString()}`;
							}
						}
					}

					// Second API call to get slogan info
					const apiUrl = `https://ecapi-cdn.pchome.com.tw/cdn/ecshop/prodapi/v2/prod/${pcid}/desc&fields=Meta,SloganInfo&_callback=jsonp_desc?_callback=jsonp_desc`;
					const apiResp = await axios.get(apiUrl, { timeout: 2500 });

					if (apiResp.status === 200) {
						const sloganMatch = apiResp.data.match(/SloganInfo":\[(.*?)\]/);
						if (sloganMatch) {
							const slogans = unescape(sloganMatch[1].replace(/\\u/g, '%u'))
								.replace(/^"|"$/g, '')
								.split('","');
							sloganText = slogans.map(slogan => `• ${slogan}`).join('\n');
						}
					}
				}
				catch (apiError) {
					console.error('Failed to fetch data from API:', apiError);
					// Fallback to scraped price if API fails
					const scrapedPrice = $('.o-prodPrice').first().text();
					if (scrapedPrice) {
						priceDisplay = scrapedPrice;
					}
				}
			}

			if (!title || !imageUrl) {
				throw new Error('Could not find product title or image.');
			}

			const embed = new EmbedBuilder()
				.setTitle(title)
				.setURL(url)
				.setColor('#eb4034')
				.setImage(imageUrl)
				.setFooter({ text: 'Powered by PChome 24h 購物' });

			const fields = [{ name: 'Price', value: priceDisplay }];
			if (sloganText) {
				fields.push({ name: 'Features', value: sloganText });
			}
			embed.addFields(fields);

			return { type: 'embeds', content: [embed] };
		}
		catch (error) {
			console.error('Error processing PChome URL:', error);
			return { type: 'text', content: `Failed to fetch PChome product information: ${error.message}` };
		}
	}
}

module.exports = PchomeService;