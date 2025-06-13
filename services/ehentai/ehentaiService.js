const axios = require('axios');

class EhentaiService {
	constructor() {
		this.urlRegex = /https?:\/\/(e-hentai\.org|exhentai\.org)\/g\/(\d+)\/([a-z0-9]+)\/?/g;
		this.idRegex = /https?:\/\/(e-hentai\.org|exhentai\.org)\/g\/(\d+)\/([a-z0-9]+)\/?/;
	}

	detectUrls(content) {
		const matches = content.match(this.urlRegex);
		return matches || [];
	}

	async processUrl(url) {
		const match = url.match(this.idRegex);
		if (!match) return null;

		const [, , galleryId, galleryToken] = match;

		try {
			const response = await axios.post('https://api.e-hentai.org/api.php', {
				method: 'gdata',
				gidlist: [[parseInt(galleryId), galleryToken]],
				namespace: 1,
			});

			if (!response.data.gmetadata || response.data.gmetadata.length === 0) {
				return { type: 'error', content: 'Could not fetch gallery metadata.' };
			}

			const data = response.data.gmetadata[0];

			const translatedTags = this.translateTags(data.tags);

			return {
				type: 'ehentai_embed',
				data: {
					title: data.title,
					url: url,
					thumbnail: data.thumb,
					category: data.category,
					rating: data.rating,
					uploader: data.uploader,
					tags: translatedTags,
				},
			};
		}
		catch (error) {
			console.error('E-Hentai API error:', error);
			return { type: 'error', content: 'Failed to fetch data from E-Hentai API.' };
		}
	}

	translateTags(tags) {
		const tagMap = new Map();
		tags.forEach((element) => {
			const tag = element.split(':');
			const key = tag[0];
			const value = tag[1];
			if (tagMap.has(key)) {
				tagMap.get(key).push(value);
			}
			else {
				tagMap.set(key, [value]);
			}
		});

		const tagReplaceList = new Map([
			['artist', '繪師'],
			['character', '角色'],
			['cosplayer', 'Coser'],
			['female', '女性'],
			['group', '社團'],
			['language', '語言'],
			['male', '男性'],
			['mixed', '混合'],
			['other', '其他'],
			['parody', '原作'],
			['reclass', '重新分類'],
			['temp', '臨時'],
		]);

		const result = [];
		tagMap.forEach((value, key) => {
			const values = value.join(', ');
			const translatedKey = tagReplaceList.get(key) || key;
			result.push(`**${translatedKey}**: ${values}`);
		});

		return result.join('\n');
	}
}

module.exports = EhentaiService;