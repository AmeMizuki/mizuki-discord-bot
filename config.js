require('dotenv').config();

module.exports = {
	BOT_TOKEN: process.env.BOT_TOKEN,
	CLIENT_ID: process.env.CLIENT_ID,

	// 設定要監聽的頻道 ID（可以設定多個）
	MONITORED_CHANNELS: [
		// 在這裡添加要監聽的頻道 ID
		// 例如: '1234567890123456789',
		// 如果為空陣列，則監聽所有頻道
	],

	// Bot 設定
	BOT_NAME: '曉山瑞希',
	EMBED_COLORS: {
		SUCCESS: 0xDDAACC,
		INFO: 0x0099FF,
		ERROR: 0xFF0000,
	},
};