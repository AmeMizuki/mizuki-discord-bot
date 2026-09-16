const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

class SteamService {
	constructor() {
		this.apiUrl = 'https://store.steampowered.com/api/featuredcategories?cc=tw&l=zh-tw';
	}

	async fetchCurrentDeals() {
		try {
			const { data } = await axios.get(this.apiUrl, { timeout: 10000 });

			if (!data.specials || !data.specials.items) {
				throw new Error('No specials data found in Steam API response');
			}

			return data.specials.items;
		}
		catch (error) {
			console.error('Error fetching Steam deals:', error);
			throw error;
		}
	}

	formatPrice(price) {
		return `NT$ ${(price / 100).toLocaleString()}`;
	}

	formatExpirationDate(timestamp) {
		if (!timestamp) return '未知';
		const date = new Date(timestamp * 1000);
		return date.toLocaleDateString('zh-TW', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	createDealEmbed(deal) {
		const embed = new EmbedBuilder()
			.setTitle(deal.name)
			.setURL(`https://store.steampowered.com/app/${deal.id}`)
			.setColor('#1B2838')
			.setImage(deal.large_capsule_image);

		if (deal.discounted) {
			const originalPrice = this.formatPrice(deal.original_price);
			const finalPrice = this.formatPrice(deal.final_price);

			embed.addFields(
				{ name: '💰 價格', value: `~~${originalPrice}~~ **${finalPrice}**`, inline: true },
				{ name: '🏷️ 折扣', value: `**-${deal.discount_percent}%**`, inline: true },
			);
		}
		else {
			embed.addFields(
				{ name: '💰 價格', value: this.formatPrice(deal.final_price), inline: true },
			);
		}

		const platforms = [];
		if (deal.windows_available) platforms.push('🖥️ Windows');
		if (deal.mac_available) platforms.push('🍎 Mac');
		if (deal.linux_available) platforms.push('🐧 Linux');

		if (platforms.length > 0) {
			embed.addFields({ name: '💻 平台', value: platforms.join('\n'), inline: true });
		}

		if (deal.controller_support) {
			const controllerText = deal.controller_support === 'full' ? '完整支援' : '部分支援';
			embed.addFields({ name: '🎮 手把支援', value: controllerText, inline: true });
		}

		if (deal.discount_expiration) {
			embed.addFields({
				name: '⏰ 特價結束時間',
				value: this.formatExpirationDate(deal.discount_expiration),
				inline: false,
			});
		}

		embed.setFooter({ text: 'Steam 特賣資訊' });
		embed.setTimestamp();

		return embed;
	}

	async createDealsMessage(deals, limit = 5) {
		if (!deals || deals.length === 0) {
			return { content: '🎮 目前沒有 Steam 特賣資訊' };
		}

		const limitedDeals = deals.slice(0, limit);
		const embeds = limitedDeals.map(deal => this.createDealEmbed(deal));

		let content = `🎮 **Steam 每日特賣** - 目前共 ${deals.length} 個特賣項目`;
		if (deals.length > limit) {
			content += `\n（顯示前 ${limit} 個項目）`;
		}

		return { content, embeds };
	}
}

module.exports = SteamService;