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
- ✅ 監控指定 YouTube 頻道的直播開始
- ✅ 自動發送通知到指定的 Discord 頻道
- ✅ 支援多個頻道同時監控
- ✅ 每 5 分鐘檢查一次更新
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
- **間隔時間**：每 5 分鐘檢查一次
- **檢查方式**：使用 YouTube RSS Feed
- **RSS URL 格式**：`https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`

### 偵測邏輯

1. **新影片偵測**：
   - 比較最新影片 ID 與上次記錄的 ID
   - 如果不同，則視為新影片

2. **直播偵測**：
   - 檢查影片標題是否包含直播關鍵字：`live`、`直播`、`實況`
   - 分別追蹤最新影片 ID 和最新直播 ID

3. **重複通知防護**：
   - 記錄最後一個影片 ID 和直播 ID
   - 避免重複發送相同內容的通知

### 資料儲存

監控設定儲存在 `youtube_channels.json` 檔案中：

```json
[
  {
    "guildId": "伺服器ID",
    "channelId": "Discord頻道ID", 
    "youtubeChannelId": "YouTube頻道ID",
    "lastVideoId": "最後影片ID",
    "lastLiveStreamId": "最後直播ID"
  }
]
```

## 📢 通知格式

### 新影片通知
```
新的影片上傳囉！ 頻道名稱: https://www.youtube.com/watch?v=VIDEO_ID
```

### 新直播通知  
```
新的直播上傳囉！ 頻道名稱: https://www.youtube.com/watch?v=VIDEO_ID
```

### 通知特點

- ✅ **純連結格式**：方便點擊觀看
- ✅ **即時通知**：5 分鐘內偵測到更新
- ✅ **頻道名稱**：顯示 YouTube 頻道的實際名稱
- ✅ **類型區分**：明確標示是影片還是直播

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
1. **頻道沒有新內容**：檢查該 YouTube 頻道是否有新上傳
2. **RSS Feed 延遲**：YouTube RSS 可能有 5-15 分鐘延遲
3. **機器人權限不足**：確認機器人有發送訊息權限
4. **頻道 ID 錯誤**：重新確認 Channel ID 是否正確

### Q3: 可以監控多少個頻道？

**A**: 理論上沒有限制，但建議：
- 每個 Discord 頻道監控不超過 10 個 YouTube 頻道
- 避免監控更新頻率極高的頻道
- 注意 Discord 的訊息頻率限制

### Q4: 如何查看目前監控的頻道？

**A**: 目前沒有列表指令，但可以：
1. 查看 `youtube_channels.json` 檔案
2. 嘗試重複新增相同頻道，會顯示已存在訊息

## 🔧 故障排除

### 問題：機器人沒有回應指令

**解決方案**：
1. 確認機器人在線上
2. 確認你有管理員權限
3. 確認指令格式正確
4. 重新邀請機器人並給予適當權限

### 問題：通知發送失敗

**檢查項目**：
1. **機器人權限**：
   - 檢視頻道權限
   - 發送訊息權限
   - 嵌入連結權限

2. **頻道狀態**：
   - 頻道是否被刪除
   - 機器人是否被踢出伺服器

3. **日誌檢查**：
   ```
   YouTube monitoring: Channel {CHANNEL_ID} not found, removing from list.
   ```

### 問題：重複通知

**可能原因**：
- 機器人重啟導致記錄遺失
- YouTube RSS Feed 異常
- 直播狀態變更

**解決方案**：
- 重啟機器人
- 移除後重新新增監控
- 檢查 `youtube_channels.json` 檔案完整性

## 📝 技術細節

### 相關檔案

- `commands/youtubeCommands.js` - 指令處理邏輯
- `services/youtube/youtubeService.js` - YouTube API 服務
- `utils/youtubeStorage.js` - 資料儲存管理
- `youtube_channels.json` - 監控設定檔案

### API 限制

- **YouTube RSS Feed**：無需 API Key，但有快取延遲
- **更新頻率**：建議不低於 5 分鐘間隔
- **併發請求**：避免同時請求過多頻道

### 效能考量

- 每個監控頻道每 5 分鐘發送一次 HTTP 請求
- RSS 解析使用 `rss-parser` 套件
- 資料儲存使用 JSON 檔案（適合小規模使用）

---

## 📞 支援

如果遇到問題，請：

1. **檢查本指南的故障排除章節**
2. **確認 Channel ID 格式正確**
3. **檢查機器人權限設定**
4. **加入支援伺服器**：[Mizuki Bot Discord](https://discord.gg/avMvrhdX3r)

---

*最後更新：2025-07-01*
