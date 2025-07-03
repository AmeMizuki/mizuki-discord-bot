# YouTube Channel Monitoring Guide

This guide provides detailed instructions on how to use the YouTube channel monitoring feature of Akiyama Mizuki Discord Bot, including how to obtain `channel_id` and set up monitoring.

## 📋 Table of Contents

- [Feature Overview](#feature-overview)
- [How to Get YouTube Channel ID](#how-to-get-youtube-channel-id)
- [Using Commands](#using-commands)
- [Monitoring Mechanism](#monitoring-mechanism)
- [Notification Format](#notification-format)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Troubleshooting](#troubleshooting)

## 🎯 Feature Overview

The YouTube channel monitoring feature can:

- ✅ Monitor new video uploads from specified YouTube channels
- ✅ Monitor livestream starts from specified YouTube channels
- ✅ Automatically send notifications to designated Discord channels
- ✅ Support monitoring multiple channels simultaneously
- ✅ Check for updates every 5 minutes
- ✅ Persistent storage of settings (maintained after restart)

## 🔍 How to Get YouTube Channel ID

A YouTube Channel ID is a 24-character string starting with `UC`, for example: `UCxxxxxxxxxxxxxxxxxxxxxx`

### Method 1: From Channel Page URL

1. **Go to the target YouTube channel**
2. **Check the URL format**:
   - If the URL is `https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx`
   - Then `UCxxxxxxxxxxxxxxxxxxxxxx` is the Channel ID

### Method 2: From Custom URL

If the channel uses a custom URL (like `https://www.youtube.com/@channelname`):

1. **Go to the channel page**
2. **Right-click on the page → View Page Source**
3. **Search for `"channelId"`**
4. **Find content like this**:
   ```json
   "channelId":"UCxxxxxxxxxxxxxxxxxxxxxx"
   ```

### Method 3: Using Online Tools

1. **Go to** [commentpicker.com/youtube-channel-id.php](https://commentpicker.com/youtube-channel-id.php)
2. **Enter the channel URL or channel name**
3. **Get the Channel ID**

### Method 4: From Video Page

1. **Go to any video from that channel**
2. **Click on the channel name**
3. **Check the Channel ID in the URL**

### Method 5: Browser Developer Tools

1. **Go to the YouTube channel page**
2. **Press F12 to open Developer Tools**
3. **Go to Console tab**
4. **Paste and run this code**:
   ```javascript
   ytInitialData.metadata.channelMetadataRenderer.externalId
   ```
5. **The Channel ID will be displayed**

### ⚠️ Important Notes

- **Channel ID vs Channel Handle**: Don't confuse `@channelname` (handle) with Channel ID
- **Case Sensitive**: Channel IDs are case-sensitive
- **Validation**: The bot automatically validates Channel ID format
- **24 Characters**: All valid Channel IDs are exactly 24 characters long

## 🤖 Using Commands

### Prerequisites

- Must have **Administrator permissions**
- Bot must be in the server
- Bot must have permission to send messages

### Add Monitoring

```
/youtube add channel_id:UCxxxxxxxxxxxxxxxxxxxxxx
```

**Parameter Description**:
- `channel_id`: YouTube Channel ID (must start with `UC`, 24 characters long)

**Success Response**:
```
✅ Started tracking YouTube channel ID: UCxxxxxxxxxxxxxxxxxxxxxx in #general.
```

### Remove Monitoring

```
/youtube remove channel_id:UCxxxxxxxxxxxxxxxxxxxxxx
```

**Success Response**:
```
✅ Stopped tracking YouTube channel ID: UCxxxxxxxxxxxxxxxxxxxxxx in #general.
```

## 📚 Examples

### Example 1: Adding Popular Channels

**Adding PewDiePie's channel**:
```
/youtube add channel_id:UC-lHJZR3Gqxm24_Vd_AJ5Yw
```

**Adding MrBeast's channel**:
```
/youtube add channel_id:UCX6OQ3DkcsbYNE6H8uQQuVA
```

### Example 2: Error Scenarios

**Invalid Channel ID (too short)**:
```
/youtube add channel_id:UC123
```
Response: `⚠️ Invalid YouTube channel ID. Please check if the ID format is correct.`

**Already tracking**:
```
/youtube add channel_id:UC-lHJZR3Gqxm24_Vd_AJ5Yw
```
Response: `⚠️ This channel is already tracking YouTube channel ID: UC-lHJZR3Gqxm24_Vd_AJ5Yw.`

### Example 3: Notification Examples

**When PewDiePie uploads a new video**:
```
新的影片上傳囉！ PewDiePie: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**When a channel starts a livestream**:
```
新的直播上傳囉！ Channel Name: https://www.youtube.com/watch?v=abc123def456
```

## ⚙️ Monitoring Mechanism

### Check Frequency
- **Interval**: Check every 5 minutes
- **Method**: Using YouTube RSS Feed
- **RSS URL Format**: `https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`

### Detection Logic

1. **New Video Detection**:
   - Compare latest video ID with last recorded ID
   - If different, consider it a new video

2. **Livestream Detection**:
   - Check if video title contains livestream keywords: `live`, `直播`, `實況`
   - Track latest video ID and latest livestream ID separately

3. **Duplicate Notification Protection**:
   - Record last video ID and livestream ID
   - Avoid sending duplicate notifications for the same content

### Data Storage

Monitoring settings are stored in `youtube_channels.json` file:

```json
[
  {
    "guildId": "Server ID",
    "channelId": "Discord Channel ID", 
    "youtubeChannelId": "YouTube Channel ID",
    "lastVideoId": "Last Video ID",
    "lastLiveStreamId": "Last Livestream ID"
  }
]
```

## 📢 Notification Format

### New Video Notification
```
新的影片上傳囉！ Channel Name: https://www.youtube.com/watch?v=VIDEO_ID
```

### New Livestream Notification
```
新的直播上傳囉！ Channel Name: https://www.youtube.com/watch?v=VIDEO_ID
```

**Note**: The notifications are currently in Traditional Chinese. The format shows:
- `新的影片上傳囉！` = "New video upload!"
- `新的直播上傳囉！` = "New livestream upload!"

### Notification Features

- ✅ **Plain Link Format**: Easy to click and watch
- ✅ **Real-time Notifications**: Detected within 5 minutes of update
- ✅ **Channel Name**: Shows the actual YouTube channel name
- ✅ **Type Distinction**: Clearly indicates whether it's a video or livestream

## ❓ Frequently Asked Questions

### Q1: What if Channel ID format is incorrect?

**A**: Ensure the Channel ID meets the following criteria:
- Starts with `UC`
- Total length of 24 characters
- Contains only alphanumeric characters

**Error Message**:
```
⚠️ Invalid YouTube channel ID. Please check if the ID format is correct.
```

### Q2: Why am I not receiving notifications?

**Possible Reasons**:
1. **No new content**: Check if the YouTube channel has new uploads
2. **RSS Feed delay**: YouTube RSS may have 5-15 minute delays
3. **Insufficient bot permissions**: Ensure bot has message sending permissions
4. **Incorrect Channel ID**: Re-verify the Channel ID is correct

### Q3: How many channels can be monitored?

**A**: Theoretically no limit, but recommendations:
- Monitor no more than 10 YouTube channels per Discord channel
- Avoid monitoring channels with extremely high update frequency
- Be mindful of Discord's message rate limits

### Q4: How to view currently monitored channels?

**A**: Currently no list command available, but you can:
1. Check the `youtube_channels.json` file
2. Try adding the same channel again, it will show an "already exists" message

## 🔧 Troubleshooting

### Issue: Bot not responding to commands

**Solutions**:
1. Confirm bot is online
2. Confirm you have administrator permissions
3. Confirm command format is correct
4. Re-invite bot with appropriate permissions

### Issue: Notification sending failed

**Check Items**:
1. **Bot Permissions**:
   - View channel permissions
   - Send messages permission
   - Embed links permission

2. **Channel Status**:
   - Whether channel was deleted
   - Whether bot was kicked from server

3. **Log Check**:
   ```
   YouTube monitoring: Channel {CHANNEL_ID} not found, removing from list.
   ```

### Issue: Duplicate notifications

**Possible Causes**:
- Bot restart causing record loss
- YouTube RSS Feed anomaly
- Livestream status changes

**Solutions**:
- Restart bot
- Remove and re-add monitoring
- Check `youtube_channels.json` file integrity

## 📝 Technical Details

### Related Files

- `commands/youtubeCommands.js` - Command handling logic
- `services/youtube/youtubeService.js` - YouTube API service
- `utils/youtubeStorage.js` - Data storage management
- `youtube_channels.json` - Monitoring configuration file

### API Limitations

- **YouTube RSS Feed**: No API Key required, but has cache delays
- **Update Frequency**: Recommended minimum 5-minute intervals
- **Concurrent Requests**: Avoid requesting too many channels simultaneously

### Performance Considerations

- Each monitored channel sends one HTTP request every 5 minutes
- RSS parsing uses `rss-parser` package
- Data storage uses JSON files (suitable for small-scale use)

---

## 📞 Support

If you encounter issues, please:

1. **Check the troubleshooting section in this guide**
2. **Confirm Channel ID format is correct**
3. **Check bot permission settings**
4. **Join support server**: [Mizuki Bot Discord](https://discord.gg/avMvrhdX3r)

---

*Last updated: 2025-07-01*
