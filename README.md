[繁體中文](README.zh-TW.md) | [English](README.md) | [Changelog](CHANGELOG.md)

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
│   ├── aiRankingCommands.js      # /ai-ranking slash command (Artificial Analysis leaderboard)
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
│   ├── artificialAnalysis/
│   │   └── artificialAnalysisService.js # Artificial Analysis leaderboard API + cache
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
   AA_BENCHMARK_API=YOUR_ARTIFICIAL_ANALYSIS_API_KEY
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
| `/translate` | Takes a tweet link (`x.com`, `twitter.com`, or a `fixupx.com`/`fixvx.com` mirror) plus a target language (`tw`, `cn`, `en`, `jp`, …). |
| `/ai-ranking` | Shows the Top 10 AI models from [Artificial Analysis](https://artificialanalysis.ai/) by `intelligence`, `coding`, `math`, or `speed`, with a bar chart. Each model is listed once, at its highest reasoning effort. |

### Automatic Features

1. **Multi-Platform URL Conversion**: When someone posts links from supported platforms, the bot will:
   - Automatically detect URLs from Twitter/X, Pixiv, Bilibili, PChome, Reddit, E-Hentai/ExHentai, Misskey, Facebook, TikTok, Instagram, and Threads
   - Suppress Discord's native embeds for better presentation
   - Create enhanced embeds with platform-specific formatting
   - Provide fallback links if processing fails

   Platform-specific behavior:
   - **Twitter/X**: Display multiple images from tweets in separate embeds, render GIFs as animated embeds, and post videos as a preview link plus embed
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
- Right-click an image message → **檢查圖片資訊** to receive its metadata embed by DM.
- **ComfyUI**: Separate positive/negative prompts and SDXL-style fields for steps, CFG, sampler, scheduler, seed, actual image dimensions, models, LoRA names/weights, VAE, upscaler models, and upscale methods.
- The executed PNG `prompt` graph takes precedence and conditioning links determine prompt polarity. Workflow-only files use standard node widgets and links. Keep the `prompt` metadata for custom nodes; stripped metadata cannot be reconstructed.
- Run the parser/embed check with `node utils/metadata.test.js`.

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


## License

This project is for learning and personal use only.
