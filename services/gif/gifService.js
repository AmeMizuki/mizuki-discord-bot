const axios = require('axios');
const cheerio = require('cheerio');

const EZGIF_BASE = 'https://ezgif.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const MAX_DURATION_SECONDS = 10;
const MAX_FPS = 12;
const OUTPUT_SIZE = '480p';

class GifService {
	constructor() {
		this.queue = Promise.resolve();
		this.pending = 0;
	}

	convertVideoToGif(videoUrl) {
		this.pending++;
		const task = this.queue.then(() => this._convert(videoUrl));
		this.queue = task.catch(console.error);
		return task.finally(() => { this.pending--; });
	}

	async _convert(videoUrl) {
		const uploadResp = await axios.post(
			`${EZGIF_BASE}/video-to-gif`,
			new URLSearchParams({ 'new-image-url': videoUrl, upload: 'Upload video!' }),
			{ headers: { 'User-Agent': USER_AGENT }, timeout: 60000 },
		);

		const $upload = cheerio.load(uploadResp.data);
		const file = $upload('input[name="file"]').attr('value');
		if (!file) {
			throw new Error('無法讀取影片，請確認格式受支援（MP4/WebM/MOV 等）。');
		}

		const detectedDuration = parseFloat($upload('#end').attr('value'));
		const detectedFps = $upload('input[name="detected-fps"]').attr('value') || '30';
		const end = Math.min(MAX_DURATION_SECONDS, detectedDuration || MAX_DURATION_SECONDS);

		const convertResp = await axios.post(
			`${EZGIF_BASE}/video-to-gif/${file}`,
			new URLSearchParams({
				file,
				start: '0',
				end: String(end),
				size: OUTPUT_SIZE,
				crop: 'none',
				ar: 'no',
				fps: String(MAX_FPS),
				fpsr: String(MAX_FPS),
				'detected-fps': detectedFps,
				method: 'ezgif',
				loop: '0',
				'video-to-gif': 'Convert to GIF!',
			}),
			{ headers: { 'User-Agent': USER_AGENT }, timeout: 120000 },
		);

		const $result = cheerio.load(convertResp.data);
		const gifSrc = $result('img.output').attr('src');
		if (!gifSrc) {
			throw new Error('GIF 轉換失敗，請稍後再試。');
		}

		return gifSrc.startsWith('//') ? `https:${gifSrc}` : gifSrc;
	}
}

module.exports = GifService;
