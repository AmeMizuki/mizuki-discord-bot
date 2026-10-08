# Changelog

[繁體中文](CHANGELOG.zh-TW.md) | [English](CHANGELOG.md)
### Version 1.10.3 (2026-10-08)

*   **Fix:** `/translate` and language-suffixed Twitter/X mirror links keep the main and quoted translations, quoted author, and source links together in the first embed. Photos use separate native galleries for the main and quoted tweet without stitching. All main and quoted videos produce `[Preview]` hyperlinks in a preview-only message before the embeds, matching URL conversion behavior. Unavailable quoted translations retain the original text.
*   **Fix:** Twitter/X posts with multiple GIFs now fetch each animated preview and display them together in one gallery instead of showing only the first. Applies to URL conversion, `/translate`, language-suffixed mirror links, and quoted tweets in translations. Mixed video/photo/GIF posts send video `[Preview]` links first, then display their photos and GIFs together; only an individual failed GIF preview falls back to a `[Preview]` link.
*   **Change:** Temporarily suspended automatic Threads URL conversion because no stable conversion API service is currently available. Removed the FxThreads service and its dedicated embed builder. Threads links no longer receive conversion replies; standalone Threads links retain Discord's native previews. Support can resume when a stable service becomes available.

### Version 1.10.0 (2026-10-01)

*   **Fix:** Twitter/X translations retain the main tweet's photos and show a hyperlink to the quoted original tweet together with its photos. Applies to `/translate` and fixupx/fixvx links with a language suffix.
*   **New Feature:** ComfyUI image metadata now shows sampling parameters, connected positive/negative prompts, models/LoRAs, and upscale models/methods in SDXL-style fields. Fixed separate PNG `prompt`/`workflow` chunks and zTXt decompression.

### Version 1.9.0 (2026-09-23)

*   **New Feature:** Added `/ai-ranking` to show the Artificial Analysis AI model leaderboard with a bar chart.

### Version 1.8.2 (2026-09-23)

*   **Change:** Twitter/X GIF posts now show as an animated embed instead of a link.
*   **Change:** Twitter/X video posts (including `/translate`) now post a video preview link followed by the tweet embed, replacing the fixvx fallback.
*   **New Feature:** fixupx/fixvx links with a language suffix (e.g. `/status/123/tw`) now show the full translation in an embed.

### Version 1.8.1 (2026-09-21)

*   **Fix:** Twitter/X video links (not just GIFs) now fall back to `fixvx.com` when fixupx fails to render the video (empty embed or "post unavailable"), by probing the fixupx page for an `og:video` tag before using it. Applies to both automatic message embeds and the `/translate` command's video replies.

### Version 1.8.0 (2026-09-16)

*   **New Feature:** Added a "轉換為GIF" message context menu command that converts the video in a message (an attachment, or a video embed unfurled from a link) into a GIF and posts it to the channel. Only one conversion runs at a time; others queue. If the resulting GIF is too large to upload, the requester is told it failed instead of getting a fallback link.
*   **Fix:** Steam sale broadcasts now post the current deal list on a fixed daily schedule (12:00 Asia/Taipei), replacing the previous diff-only check that silently skipped a day's broadcast whenever the process restarted.
*   **Fix:** `UrlConversionService` was being reconstructed on every single message, recompiling all 11 platform services' URL patterns each time; it's now a shared singleton. This also fixes the delete-message permission check, which always failed silently because each check ran against a fresh, empty instance and fell back to an extra Discord API call.
*   **Enhancement:** Added missing request timeouts for Pixiv, E-Hentai, PChome, and image metadata fetches so a stalled upstream can't hang a connection indefinitely.

### Version 1.7.0 (2026-09-14)

*   **New Feature:** Added Facebook, TikTok, Instagram, and Threads URL conversion services.
*   **New Feature:** Facebook, TikTok, and Instagram links are converted to their fix-domain equivalent (`facebed.com`, `tnktok.com`, `oginstagram.com`/`zzinstagram.com`) and rendered as a hidden-link embed built from the page's Open Graph data; posts containing video still post the link directly so Discord can play it.
*   **New Feature:** Threads links are resolved via [FxThreads](https://github.com/AkitsukiNagi/FxThreads) into a gray embed — a single image renders directly, multiple images use a Discord gallery (up to 4, mirroring the X/Twitter preview) — falling back to a `fx.akitsuki.me` link for video posts or when the API is unavailable.
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

