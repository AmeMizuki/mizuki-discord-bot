# YouTube 頻道監控使用指南

本指南將詳細說明如何使用 Akiyama Mizuki Discord Bot 的 YouTube 頻道監控功能，包括如何獲取 `channel_id` 以及設定監控。

## 📋 目錄

- [功能概述](#功能概述)
- [如何獲取 YouTube Channel ID](#如何獲取-youtube-channel-id)
- [使用指令](#使用指令)
- [監控機制](#監控機制)
- [通知格式](#通知格式)
- [常見問題](#常見問題)
- [故障排除](#故障排除)

## 🎯 功能概述

YouTube 頻道監控功能可以：

- ✅ 監控指定 YouTube 頻道的新影片上傳
- ✅ 自動發送通知到指定的 Discord 頻道
- ✅ 支援多個頻道同時監控
- ✅ 每日檢查一次更新
- ✅ 持久化儲存設定（重啟後保持）

## 🔍 如何獲取 YouTube Channel ID

YouTube Channel ID 是一個以 `UC` 開頭的 24 字元字串，例如：`UCxxxxxxxxxxxxxxxxxxxxxx`

### 方法 1：從頻道頁面 URL 獲取

1. **前往目標 YouTube 頻道**
2. **查看 URL 格式**：
   - 如果 URL 是 `https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx`
   - 那麼 `UCxxxxxxxxxxxxxxxxxxxxxx` 就是 Channel ID

### 方法 2：從自訂 URL 獲取

如果頻道使用自訂 URL（如 `https://www.youtube.com/@channelname`）：

1. **前往頻道頁面**
2. **右鍵點擊頁面 → 檢視原始碼**
3. **搜尋 `"channelId"`**
4. **找到類似這樣的內容**：
   ```json
   "channelId":"UCxxxxxxxxxxxxxxxxxxxxxx"
   ```

### 方法 3：使用線上工具

1. **前往** [commentpicker.com/youtube-channel-id.php](https://commentpicker.com/youtube-channel-id.php)
2. **輸入頻道 URL 或頻道名稱**
3. **獲取 Channel ID**

### 方法 4：從影片頁面獲取

1. **前往該頻道的任一影片**
2. **點擊頻道名稱**
3. **查看 URL 中的 Channel ID**

### 方法 5：使用瀏覽器開發工具

1. **前往 YouTube 頻道頁面**
2. **按下 F12 開啟開發者工具**
3. **切換到 Console 索引標籤**
4. **貼上並執行以下代碼**：
   ```javascript
   ytInitialData.metadata.channelMetadataRenderer.externalId
   ```
5. **Channel ID 會被顯示出來**

## 🤖 使用指令

### 前置條件

- 必須具有**管理員權限**
- 機器人必須在該伺服器中
- 機器人必須有發送訊息的權限

### 新增監控

```
/youtube add channel_id:UCxxxxxxxxxxxxxxxxxxxxxx
```

**參數說明**：
- `channel_id`：YouTube 頻道 ID（必須以 `UC` 開頭，長度為 24 字元）

**成功回應**：
```
✅ 已開始追蹤 YouTube 頻道 ID：UCxxxxxxxxxxxxxxxxxxxxxx 於 #general.
```

### 移除監控

```
/youtube remove channel_id:UCxxxxxxxxxxxxxxxxxxxxxx
```

**成功回應**：
```
✅ 已停止追蹤 YouTube 頻道 ID：UCxxxxxxxxxxxxxxxxxxxxxx 於 #general.
```

## ⚙️ 監控機制

### 檢查頻率
- **間隔時間**：每天輪詢一次
- **檢查方式**：使用 YouTube RSS Feed
- **RSS URL 格式**：`https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`

### 偵測邏輯

1. **新影片偵測**：
   - 機器人會獲取頻道 RSS Feed 中的最新影片。
   - 它會比較最新影片的 ID 與上次為該頻道記錄的 ID。
   - 如果 ID 是新的，就會發送通知，並儲存新的 ID 以防止重複通知。

### 資料儲存

監控設定儲存在 `youtube_channels.json` 檔案中：

```json
[
  {
    "guildId": "伺服器ID",
    "channelId": "Discord頻道ID", 
    "youtubeChannelId": "YouTube頻道ID",
    "lastVideoId": "最後影片ID"
  }
]
```

## 📢 通知格式

### 新影片通知
```
新影片上傳囉！ 頻道名稱: https://www.youtube.com/watch?v=VIDEO_ID
```

### 通知特點

- ✅ **純連結格式**：方便點擊觀看
- ✅ **每日檢查**：每天檢查一次新內容
- ✅ **頻道名稱**：顯示 YouTube 頻道的實際名稱

## ❓ 常見問題

### Q1: Channel ID 格式錯誤怎麼辦？

**A**: 確認 Channel ID 符合以下條件：
- 以 `UC` 開頭
- 總長度為 24 字元
- 只包含英數字元

**錯誤訊息**：
```
⚠️ 無效的 YouTube 頻道 ID。請確認 ID 格式是否正確。
```

### Q2: 為什麼沒有收到通知？

**可能原因**：
1. **沒有新內容**：自上次每日檢查以來，該頻道可能尚未上傳新影片。
2. **RSS Feed 延遲**：YouTube 的 RSS Feed 有時可能會延遲。
3. **每日檢查排程**：機器人每天檢查一次。您可能需要等待最多 24 小時才能收到通知。
4. **機器人權限不足**：確保機器人在目標頻道中有發送訊息的權限。
5. **頻道 ID 錯誤**：重新確認 Channel ID 是否正確。

### Q3: 可以監控多少個頻道？

**A**: 理論上沒有硬性限制，但建議保持合理的數量以確保順暢運作。由於每天只檢查一次，監控對資源的消耗不大。

### Q4: 如何查看目前監控的頻道？

**A**: 目前沒有列表指令，但可以：
1. 查看機器人所在的伺服器上的 `youtube_channels.json` 檔案。
2. 嘗試重複新增相同頻道，如果已在追蹤，機器人會通知您。

## 🔧 故障排除

### 問題：機器人沒有回應指令

**解決方案**：
1. 確認機器人在線上。
2. 確認您在伺服器上具有管理員權限。
3. 確認指令格式正確。
4. 如有需要，���用適當的權限重新邀請機器人。

### 問題：通知發送失敗

**檢查項目**：
1. **機器人權限**：
   - 查看頻道
   - 發送訊息
   - 嵌入連結

2. **頻道狀態**：
   - 檢查頻道是否被刪除或機器人是否被踢出伺服器。

3. **日誌檢查**：
   - 如果找不到頻道，機器人會記錄錯誤，例如：`YouTube monitoring: Channel {CHANNEL_ID} not found, removing from list.`

## 📝 技術細節

### 相關檔案

- `commands/youtubeCommands.js` - 指令處理邏輯
- `services/youtube/youtubeService.js` - YouTube API 服務
- `utils/youtubeStorage.js` - 資料儲存管理
- `youtube_channels.json` - 監控設定檔案

### API 限制

- **YouTube RSS Feed**：無需 API Key，但可能有快取延遲。
- **更新頻率**：機器人每天檢查一次，以尊重服務並避免達到速率限制。

### 效能考量

- 每個監控的頻道每天發送一次 HTTP 請求，對效能影響極小。
- RSS 解析使用 `rss-parser` 套件。
- 資料儲存使用 JSON 檔案，適合中小型規模使用。

---

## 📞 支援

如果遇到問題，請：

1. **檢查本指南的故障排除章節**
2. **確認 Channel ID 格式正確**
3. **檢查機器人權限設定**
4. **加入支援伺服器**：[Mizuki Bot Discord](https://discord.gg/avMvrhdX3r)

---

*最後更新：2025-07-05*