[繁體中文](README.zh-TW.md) | [English](README.md)

***

# Akiyama Mizuki Discord Bot

Pleaese join the Discord server if encounter problem： [Mizuki Bot](https://discord.gg/avMvrhdX3r)

A cute Discord bot specialized in extracting and displaying Stable Diffusion metadata information from images, with support for multi-platform URL conversion and embeds.

![image](https://github.com/user-attachments/assets/fbbe6a4a-2a9b-49ba-a1f9-36b992d0c039)

## Features

- 🔍 Automatically adds a magnifying glass emoji to image messages in monitored channels.
- ❤️ Automatically adds a heart emoji to image messages in monitored channels.
- 📊 Extracts and displays Stable Diffusion parameters (prompt, negative prompt, model, etc.).
- 💬 Replies via private message to protect user privacy.
- ⚙️ Administrators can set monitored channels.
- 💾 Monitored channel settings are persistently saved.
- ⭐ **Favorite image function**: Users can favorite images via heart emoji reaction or a right-click context menu command ("Favorite Image"). Favorited images are sent to the user via private message in an aesthetically pleasing embed format, including the image itself and a link to the original message.
- 🔗 **Multi-Platform URL Conversion**: Automatically converts links from various platforms to enhanced embeds.
- 🖼️ **Multi-Image Support**: Displays multiple images from supported platforms in a single message using multiple embeds.
- 💰 **Steam Sale Notifications**: Automatically fetch and display Steam game sale information and push notifications to a designated channel.
- 🎀 Cute response tone.

## Supported Features
- [x] Twitter/X
- [x] Pixiv
- [x] PTT
- [x] Bilibili
- [x] PChome
- [x] Civitai
- [x] Reddit
- [x] E-Hentai & ExHentai

## File Structure

```
discordbot/
├── index.js                      # Main program entry point
├── config.js                     # Configuration file
├── package.json                  # Dependency management
├── .env                          # Environment variables (needs to be created manually)
├── monitored_channels.json       # Monitored channel settings (auto-generated, added to .gitignore)
├── monitored_channels.example.json # Example monitored channel settings
├── commands/
│   └── index.js                  # Slash command handling
├── services/                     # URL conversion services
│   ├── index.js                  # Service manager
│   ├── twitter/
│   │   ├── twitterService.js     # Twitter/X URL processing
│   │   └── twitterUtils.js       # Twitter utility functions
│   ├── pixiv/
│   │   └── pixivService.js       # Pixiv artwork URL processing
│   ├── ptt/
│   │   └── pttService.js         # PTT post URL processing
│   ├── bilibili/
│   │   └── bilibiliService.js    # Bilibili video/content URL processing
│   ├── pchome/
│   │   └── pchomeService.js      # PChome 24h shopping URL processing
│   ├── ehentai/
│   │   └── ehentaiService.js     # E-Hentai & ExHentai URL processing
│   └── README.md                 # Services documentation
└── utils/
    ├── metadata.js               # Metadata parsing utilities
    ├── embedBuilder.js           # Discord Embed construction utilities
    ├── channelStorage.js         # Channel settings persistence utilities
    └── steamStorage.js           # Steam game data persistence utilities
```

## Installation and Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
BOT_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_BOT_CLIENT_ID
```

3. Start the bot:
```bash
node index.js
```

## Monitored Channel Settings

If you need to set up manually, refer to the `monitored_channels.example.json` format:

```json
{
  "channels": [
    "CHANNEL_ID_1",
    "CHANNEL_ID_2"
  ],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

**Note**:
- If the `channels` array is empty, the bot will not automatically monitor any channels.
- Only channels set via the `/setchannel` command will be monitored.
- Settings will persist after bot restarts.

## Usage

### Slash Commands

- `/finddata` - Upload an image to view its metadata.
- `/setchannel` - Set monitored channels (administrator only).
  - `action: Add Channel` - Add a channel to the monitored list.
  - `action: Remove Channel` - Remove a channel from the monitored list.
  - `action: Clear All Channels` - Clear the monitored list (bot will not monitor any channels automatically).
  - `action: View Current Channels` - View currently monitored channels.

### Automatic Features

1. **Image Metadata Extraction**: When someone uploads an image in a monitored channel, Akiyama Mizuki will automatically add 🔍 and ❤️ emojis.
   - Clicking the 🔍 emoji will send a private message containing the image's metadata.
   - Clicking the ❤️ emoji or using the right-click context menu command "Favorite Image" will send a private message with an aesthetically pleasing embed of the image and a link to the original message.

2. **Multi-Platform URL Conversion**: When someone posts links from supported platforms, the bot will:
   - Automatically detect URLs from Twitter/X, Pixiv, PTT, Bilibili, and PChome
   - Suppress Discord's native embeds for better presentation
   - Create enhanced embeds with platform-specific formatting
   - **Twitter/X**: Display multiple images from tweets in separate embeds, handle videos via fxtwitter links
   - **Pixiv**: Show artwork previews with artist information
   - **PTT**: Display post content with proper formatting
   - **Bilibili**: Provide video/content previews
   - **PChome**: Show product information including images, names, prices, and feature highlights
   - Provide fallback links if processing fails

3. **Steam Sale Notifications**: Automatically fetch the latest Steam game sale information daily and send notifications to a designated channel. Users can also manually query for sale information using a slash command.

## Supported Image Formats

- PNG - Supports tEXt and zTXt chunks.

## Development Notes

### Modular Structure

- `config.js` - Centralized management of configurations and environment variables.
- `utils/metadata.js` - Handles image metadata parsing.
- `utils/embedBuilder.js` - Constructs Discord embed messages.
- `utils/channelStorage.js` - Handles persistent storage of monitored channel settings.
- `commands/index.js` - Handles slash command logic.
- `services/` - **NEW**: Modular URL conversion services architecture.

### Adding New URL Conversion Services

The bot now supports a modular architecture for URL conversion services. To add new services (Instagram, TikTok, etc.):

1. Create a new service directory: `services/[service-name]/`
2. Implement the service class following the pattern in `services/twitter/twitterService.js`
3. Register the service in `services/index.js`
4. See `services/README.md` for detailed instructions

### Adding New Features

When adding new features, please follow modular principles:
1. Place related functionalities in corresponding modules.
2. Adhere to the Single Responsibility Principle.
3. Use `module.exports` to export necessary functions.

## Changelog

### Version 1.4.0 (2024-06-13)

*   **New Feature:** Added Steam game sale notification feature.
*   **Enhancement:** Implemented daily automatic fetching and pushing of Steam sale information.
*   **Architecture:** Added `services/steam/` for Steam API integration and `utils/steamStorage.js` for data persistence.
*   **New Feature:** Added E-Hentai & ExHentai URL conversion support for manga and illustration previews.
*   **Enhancement:** Pixiv manga and illustration previews.
*   **Enhancement:** Platform-specific embed formatting for optimal user experience.

### Version 1.2.2 (2025-06-12)

*   **New Feature:** Completed multi-platform URL conversion system with PChome 24h shopping support.
*   **Enhancement:** Comprehensive URL detection and processing for Twitter/X, Pixiv, PTT, Bilibili, and PChome.
*   **Enhancement:** Platform-specific embed formatting for optimal user experience.
*   **Architecture:** Expanded service architecture with dedicated processors for each platform.
*   **Integration:** Unified URL conversion service managing all platform integrations.

### Version 1.2.0 (2025-06-11)

*   **Major Refactor:** Implemented modular URL conversion services architecture.
*   **New Feature:** Twitter/X URL conversion with enhanced embeds.
*   **New Feature:** Multi-image support for tweets using multiple embeds per message.
*   **Enhancement:** Automatic suppression of Discord's native Twitter embeds.
*   **Enhancement:** Support for videos via fxtwitter fallback links.
*   **Architecture:** Created `services/` directory for organized URL conversion services.
*   **Architecture:** Moved Twitter-related utilities to `services/twitter/`.
*   **Architecture:** Implemented `UrlConversionService` for unified URL processing.
*   **Documentation:** Added comprehensive `services/README.md` for service development.

### Version 1.0.0 (2025-06-10)

*   **New Feature:** Added image favoriting feature via heart emoji reaction.
*   **New Feature:** Added "Favorite Image" right-click context menu command.
*   **Enhancement:** Favorited images are now sent via private message with an embedded image and a link to the original message, using a `#DDAACC` color for aesthetic presentation.
*   **Enhancement:** The magnifying glass reaction (for metadata) no longer includes the original message link in the private message.
*   **Refinement:** Removed transient "processing" messages (e.g., "正在幫你提取圖片的資訊喔～請稍等一下！") in private DMs for both magnifying glass and favoriting features to reduce message clutter.
*   **Bug Fix:** Enabled handling of multiple image attachments in a single message for both magnifying glass (metadata extraction) and favoriting features, ensuring all images are processed.

## License

This project is for learning and personal use only.
