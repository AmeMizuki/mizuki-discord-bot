require('dotenv').config();
const { loadMonitoredChannels } = require('./utils/channelStorage');

module.exports = {
	BOT_TOKEN: process.env.BOT_TOKEN,
	CLIENT_ID: process.env.CLIENT_ID,

	// 動態載入監聽頻道設定
	get MONITORED_CHANNELS() {
		return loadMonitoredChannels();
	},

	// Bot 設定
	BOT_NAME: '曉山瑞希',
	EMBED_COLORS: {
		SUCCESS: 0xDDAACC,
		INFO: 0x0099FF,
		ERROR: 0xFF0000,
	},
};