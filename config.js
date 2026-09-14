require('dotenv').config();

module.exports = {
	BOT_TOKEN: process.env.BOT_TOKEN,
	CLIENT_ID: process.env.CLIENT_ID,

	// Bot 設定
	BOT_NAME: '曉山瑞希',
	EMBED_COLORS: {
		SUCCESS: 0xDDAACC,
		INFO: 0x0099FF,
		ERROR: 0xFF0000,
		GRAY: 0x99AAB5,
	},
};