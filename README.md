[繁體中文](README.zh-TW.md) | [English](README.md)

***

# Akiyama Mizuki Discord Bot

Add the bot to your server: [Install Mizuki Bot](https://discord.com/oauth2/authorize?client_id=1381902438168264734)

A cute Discord bot specialized in extracting and displaying Stable Diffusion metadata information from images, with support for multi-platform URL conversion and embeds.

![image](https://github.com/user-attachments/assets/fbbe6a4a-2a9b-49ba-a1f9-36b992d0c039)

## Table of Contents

- [Features](#features)
- [Supported Platforms](#supported-platforms)
- [File Structure](#file-structure)
- [Installation and Setup](#installation-and-setup)
- [Usage](#usage)
- [Supported Image Formats](#supported-image-formats)
- [Development Notes](#development-notes)
- [Changelog](#changelog)
- [License](#license)

## Features

- 📊 Extracts and displays Stable Diffusion parameters (prompt, negative prompt, model, etc.) via a right-click context menu command ("檢查圖片資訊").
- 💬 Replies via private message to protect user privacy.
- ⭐ **Favorite image function**: Users can favorite images via a right-click context menu command ("收藏圖片"). Favorited images are sent to the user via private message in an aesthetically pleasing embed format, including the image itself and a link to the original message.
- 🔗 **Multi-Platform URL Conversion**: Automatically converts links from various platforms to enhanced embeds.
- 🖼️ **Multi-Image Support**: Displays multiple images from supported platforms in a single message using multiple embeds.
- 💰 **Steam Sale Notifications**: Automatically fetch and display Steam game sale information and push notifications to a designated channel.
- 🎬 **Video-to-GIF conversion**: Convert a video in a message to a GIF via a right-click context menu command ("轉換為GIF").
- 🎀 Cute response tone.

## Supported Platforms

- [x] Twitter/X
- [x] Pixiv
- [x] Bilibili
- [x] PChome
- [x] Reddit
- [x] E-Hentai & ExHentai
- [x] Misskey
- [x] Facebook
- [x] TikTok
- [x] Instagram
- [x] Threads

## File Structure

```
discordbot/
├── index.js                      # Main program entry point
├── config.js                     # Configuration file
├── package.json                  # Dependency management
├── .env                          # Environment variables (needs to be created manually)
├── commands/
│   ├── index.js                  # Slash command handling
│   ├── translateCommands.js      # /translate slash command (tweet translation links)
│   └── gifCommands.js            # "轉換為GIF" context menu command
├── services/                     # URL conversion services
│   ├── index.js                  # Service manager
│   ├── gif/
│   │   └── gifService.js         # Video-to-GIF conversion via ezgif.com
│   ├── twitter/
│   │   ├── twitterService.js     # Twitter/X URL processing
│   │   └── twitterUtils.js       # Twitter utility functions
│   ├── pixiv/
│   │   └── pixivService.js       # Pixiv artwork URL processing
│   ├── bilibili/
│   │   └── bilibiliService.js    # Bilibili video/content URL processing
│   ├── pchome/
│   │   └── pchomeService.js      # PChome 24h shopping URL processing
│   ├── ehentai/
│   │   └── ehentaiService.js     # E-Hentai & ExHentai URL processing
│   ├── facebook/
│   │   └── facebookService.js    # Facebook URL processing (facebed.com)
│   ├── tiktok/
│   │   └── tiktokService.js      # TikTok URL processing (tnktok.com)
│   ├── instagram/
│   │   └── instagramService.js   # Instagram URL processing (oginstagram.com/zzinstagram.com)
│   ├── threads/
│   │   └── threadsService.js     # Threads URL processing (FxThreads)
│   └── README.md                 # Services documentation
└── utils/
    ├── metadata.js               # Metadata parsing utilities
    ├── embedBuilder.js           # Discord Embed construction utilities
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

## Usage

### Commands

| Command | Description |
| --- | --- |
| Right-click a message → "檢查圖片資訊" (View Image Info) | Sends the image's metadata to you via private message. Manual trigger only. |
| Right-click a message → "收藏圖片" (Favorite Image) | Sends the image to you via private message in an aesthetically pleasing embed, along with a link to the original message. Manual trigger only. |
| Right-click a message → "轉換為GIF" (Convert to GIF) | Converts the video in the message to a GIF and posts it to the channel. |
| `/translate` | Takes a tweet link (`x.com`, `twitter.com`, or a `fixupx.com`/`fixvx.com` mirror) plus a target language (`tw`, `cn`, `en`, `jp`, …). Removes the link preview from your own message and replies with the translated tweet link. |

### Automatic Features

1. **Multi-Platform URL Conversion**: When someone posts links from supported platforms, the bot will:
   - Automatically detect URLs from Twitter/X, Pixiv, Bilibili, PChome, Reddit, E-Hentai/ExHentai, Misskey, Facebook, TikTok, Instagram, and Threads
   - Suppress Discord's native embeds for better presentation
   - Create enhanced embeds with platform-specific formatting
   - Provide fallback links if processing fails

   Platform-specific behavior:
   - **Twitter/X**: Display multiple images from tweets in separate embeds, handle videos via fixupx.com links with automatic fixvx.com fallback
   - **Pixiv**: Show artwork previews with artist information
   - **Bilibili**: Provide video/content previews
   - **PChome**: Show product information including images, names, prices, and feature highlights
   - **Misskey**: Show note content with appropriate formatting, including images and videos
   - **Facebook**: Convert links to facebed.com and render a hidden-link embed from the page's Open Graph data
   - **TikTok**: Convert links to tnktok.com; a hidden-link embed is used when possible, otherwise the link is posted as-is so Discord can play the video
   - **Instagram**: Convert links to oginstagram.com, falling back to zzinstagram.com when the primary domain is unreachable, then render a hidden-link embed from Open Graph data
   - **Threads**: Fetch post data via FxThreads and render it as an embed — a single image renders directly.

2. **Steam Sale Notifications**: Automatically fetch the latest Steam game sale information daily and send notifications to a designated channel. Users can also manually query for sale information using a slash command.

## Supported Image Formats

- PNG - Supports tEXt and zTXt chunks.

## Development Notes

### Modular Structure

- `config.js` - Centralized management of configurations and environment variables.
- `utils/metadata.js` - Handles image metadata parsing.
- `utils/embedBuilder.js` - Constructs Discord embed messages.
- `commands/index.js` - Handles slash command logic.
- `services/` - **NEW**: Modular URL conversion services architecture.

### Adding New URL Conversion Services

The bot now supports a modular architecture for URL conversion services. To add a new service:

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

### Version 1.8.0 (2026-09-14)

*   **New Feature:** Added Facebook, TikTok, Instagram, and Threads URL conversion services.
*   **New Feature:** Facebook, TikTok, and Instagram links are converted to their fix-domain equivalent (`facebed.com`, `tnktok.com`, `oginstagram.com`/`zzinstagram.com`) and rendered as a hidden-link embed built from the page's Open Graph data; posts containing video still post the link directly so Discord can play it.
*   **New Feature:** Threads links are resolved via [FxThreads](https://github.com/AkitsukiNagi/FxThreads) into a gray embed — a single image renders directly, multiple images use a Discord gallery (up to 4, mirroring the X/Twitter preview) — falling back to a `fx.akitsuki.me` link for video posts or when the API is unavailable.

### Version 1.7.0 (2026-09-14)

*   **New Feature:** Added the `/translate` slash command. It takes a tweet link (`x.com`, `twitter.com`, or a `fixupx.com`/`fixvx.com` mirror) and a target language (`tw`, `hk`, `cn`, `en`, `jp`, `kr`, …), suppresses the native link preview on the requester's own message, and replies with the translated tweet link for FxEmbed to render.
*   **Fix:** GIF posts now fall back to `fixvx.com` when fixupx's animated preview is unavailable, instead of always using fixupx. The bot probes the preview fixupx hands to Discord and switches domains only when that preview is no longer animated.

### Version 1.6.0 (2026-07-31)

*   **Change:** Twitter/X fallback links now default to `fixupx.com`, with `fixvx.com` as the backup domain (replacing `fxtwitter.com`/`vxtwitter.com`).
*   **Removed:** Automatic channel-based image monitoring (the `/setimage` command and auto-added 🔍/❤️ reactions). Image metadata lookup and favoriting are now only available via the "檢查圖片資訊" and "收藏圖片" right-click context menu commands.
*   **Removed:** Civitai and PTT URL conversion services.
*   **Removed:** YouTube channel tracking (the `/youtube` command and related monitoring).

<details>
<summary>Older versions</summary>

### Version 1.5.5 (2026-06-15)

*   **Fix:** Link embeds (Twitter/X and other platforms) sometimes were not suppressed until Discord was refreshed. Discord attaches the link preview asynchronously, *after* the message is created, so the immediate suppression on message creation could race an embed that did not exist yet. A `messageUpdate` listener now catches the embed when it actually arrives and suppresses it, so the native preview is removed reliably without needing a refresh.
*   **Fix:** Misskey notes containing multiple images are now grouped into a single embed instead of being split across separate ones.

### Version 1.5.4 (2025-09-16)

*   **New Feature:** Added Misskey URL conversion support.
*   **Enhancement:** Improved error handling for URL processing, including better error messages and fallback mechanisms.
*   **Removed:** No longer supports PTT because they blocked certain server provider I believe so.

### Version 1.5.3 (2025-07-05)

*   **Enhancement:** Removed YouTube livestream tracking to focus solely on new video notifications. Updated relevant commands and descriptions.
*   **Enhancement:** Simplified the Steam deals embed by removing the thumbnail image to provide a cleaner look.

### Version 1.5.2 (2025-07-03)

*   **Fix:** Improved Twitter/X video link handling by adding a fallback to `vxtwitter.com` when `fxtwitter.com` fails to provide a valid video URL.
*   **Optimization:** Reduced the volume of console logs to prevent potential server performance issues, retaining only essential warnings and errors.

### Version 1.5.1 (2025-07-03)

*   **Enhancement:** Implemented automatic fallback mechanism for Twitter/X URL processing.
*   **Reliability:** Added vxtwitter API as backup when fxtwitter API fails or is unavailable.
*   **Data Compatibility:** Automatic data format conversion ensures seamless switching between APIs.
*   **Error Handling:** Improved error handling with timeout protection and content validation.
*   **Logging:** Enhanced logging to track API usage and fallback scenarios.
*   **Architecture:** Updated `services/twitter/twitterUtils.js` with dual API support and format conversion utilities.

### Version 1.5.0 (2025-06-25)

*   **New Feature:** Added YouTube channel tracking.
*   **Enhancement:** YouTube new video and livestream notifications are now sent as plain links in the format "New {video/livestream} upload! {Channel Name} : {Link}".
*   **Command Changes:**
    *   `/youtube add` now requires a YouTube Channel ID.
    *   `/youtube remove` now requires a YouTube Channel ID.
    *   The `/youtube list` subcommand has been removed.

### Version 1.4.0 (2025-06-13)

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
*   **Architecture:** Expanded service architecture, for each platform with dedicated processors.
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

</details>

## License

This project is for learning and personal use only.
