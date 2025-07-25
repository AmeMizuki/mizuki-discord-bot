[English](README.md) | [繁體中文](README.zh-TW.md)

***

# 曉山瑞希 Discord Bot

如果你遇到任何問題請加入 Discord 伺服器發問： [瑞希 Bot](https://discord.gg/avMvrhdX3r)

一個可愛的 Discord 機器人，專門用來提取和顯示圖片中的 Stable Diffusion metadata 資訊，並支援多平台網址轉換和多圖片嵌入功能。

![image](https://github.com/user-attachments/assets/fbbe6a4a-2a9b-49ba-a1f9-36b992d0c039)

## 功能特色

- 🔍 自動監聽圖片並添加放大鏡表情符號
- ❤️ 自動監聽圖片並添加愛心表情符號
- 📊 提取並顯示 Stable Diffusion 參數（prompt、negative prompt、model 等）
- 💬 私訊回覆，保護用戶隱私
- ⚙️ 管理員可設定監聽頻道
- 💾 監聽頻道設定會持久化保存
- ⭐ **收藏圖片功能**：使用者可以透過愛心表情符號反應或右鍵應用程式集指令（「Favorite Image」）來收藏圖片。收藏的圖片會以美觀的嵌入式訊息格式透過私訊傳送給使用者，其中包含圖片本身及原始訊息連結。
- 🔗 **多平台網址轉換**：自動轉換各種平台連結為增強型嵌入訊息。
- 🖼️ **多圖片支援**：在單一訊息中使用多個嵌入區塊顯示支援平台的多張圖片。
- 💰 **Steam 特賣通知**：自動抓取並顯示 Steam 遊戲特賣資訊，並推播通知到指定頻道。
- 🎬 **YouTube 頻道追蹤**：監控指定的 YouTube 頻道，以便在新影片上傳時，發送純連結通知到指定的 Discord 頻道。
- 🎀 可愛的回應語氣

## 支援平台
- [x] Twitter/X
- [x] Pixiv
- [x] PTT
- [x] Bilibili
- [x] PChome
- [x] Civitai
- [x] Reddit
- [x] E-Hentai & ExHentai
- [x] YouTube

## 檔案結構

```
discordbot/
├── index.js                      # 主程式入口
├── config.js                     # 配置檔案
├── package.json                  # 依賴管理
├── .env                          # 環境變數（需自行創建）
├── commands/
│   └── index.js                  # 斜線指令處理
├── services/                     # 網址轉換服務
│   ├── index.js                  # 服務管理器
│   ├── twitter/
│   │   ├── twitterService.js     # Twitter/X 網址處理
│   │   └── twitterUtils.js       # Twitter 工具函式
│   ├── pixiv/
│   │   └── pixivService.js       # Pixiv 作品網址處理
│   ├── ptt/
│   │   └── pttService.js         # PTT 文章網址處理
│   ├── bilibili/
│   │   └── bilibiliService.js    # Bilibili 影片/內容網址處理
│   ├── pchome/
│   │   └── pchomeService.js      # PChome 24h購物網址處理
│   ├── ehentai/
│   │   └── ehentaiService.js     # E-Hentai & ExHentai URL 處理
│   └── README.md                 # 服務架構說明文件
└── utils/
    ├── metadata.js               # Metadata 解析工具
    ├── embedBuilder.js           # Discord Embed 建構工具
    └── channelStorage.js         # 頻道設定持久化工具
    └── steamStorage.js           # Steam 遊戲資料持久化工具
```

## 安裝與設定

1. 安裝依賴套件：
```bash
npm install
```

2. 創建 `.env` 檔案：
```env
BOT_TOKEN=你的機器人TOKEN
CLIENT_ID=你的機器人CLIENT_ID
```

3. 啟動機器人：
```bash
node index.js
```

## 監聽頻道設定

如果需要手動設定，可參考 `monitored_channels.example.json` 的格式：

```json
{
  "channels": [
    "頻道ID1",
    "頻道ID2"
  ],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

**注意**：
- 如果 `channels` 陣列為空，機器人不會自動監聽任何頻道
- 只有透過 `/setchannel` 指令設定的頻道才會被監聽
- 設定會在機器人重啟後保持

## 使用方式

### 斜線指令

- `/finddata` - 上傳圖片查看 metadata
- `/setchannel` - 設定監聽頻道（僅管理員可用）
  - `action: 添加頻道` - 添加頻道到監聽清單
  - `action: 移除頻道` - 從監聽清單移除頻道
  - `action: 清空所有頻道` - 清空監聽清單（不會監聽任何頻道）
  - `action: 查看當前頻道` - 查看目前監聽的頻道
- `/youtube` - YouTube 頻道追蹤 (僅管理員可用)
  - `add [channel_id]` - 開始追蹤一個 YouTube 頻道的新影片通知。需要 YouTube 頻道 ID（例如：`UC...`）。
  - `remove [channel_id]` - 停止追蹤一個 YouTube 頻道。需要 YouTube 頻道 ID。
  - 📖 **[詳細 YouTube 頻道監控使用指南](youtube-channel.zh-tw.md)** - 完整說明如何獲取頻道 ID 和使用監控功能。

### 自動功能

1. **圖片 Metadata 提取**：當有人在監聽頻道上傳圖片時，曉山瑞希會自動添加 🔍 和 ❤️ 表情符號。
   - 點擊 🔍 表情符號後，會收到包含圖片 metadata 的私訊。
   - 點擊 ❤️ 表情符號或使���右鍵應用程式集指令「Favorite Image」後，會收到包含美觀圖片 Embed 及原始訊息連結的私訊。

2. **多平台網址轉換**：當有人發送支援平台的連結時，機器人會：
   - 自動偵測來自 Twitter/X、Pixiv、PTT、Bilibili 和 PChome 的網址
   - 抑制 Discord 的原生嵌入以提供更佳呈現效果
   - 建立平台專屬格式的增強型嵌入訊息
   - **Twitter/X**：在多個嵌入區塊中顯示推文的多張圖片，透過 fxtwitter 連結處理影片，並具備 vxtwitter 自動備用機制
   - **Pixiv**：顯示作品預覽與作者資訊
   - **PTT**：顯示文章內容與適當格式化
   - **Bilibili**：提供影片/內容預覽
   - **PChome**：顯示商品資訊包含圖片、名稱、價格和特色標語
   - 在處理失敗時提供備用連結

3. **Steam 特賣通知**：每日自動抓取最新的 Steam 遊戲特賣資訊，並發送通知到指定頻道。使用者也可以透過斜線指令手動查詢特賣資訊。

4. **YouTube 通知**：當在追蹤的 YouTube 頻道偵測到新影片時，會發送純連結通知到指定的 Discord 頻道，格式為：「新影片上傳囉！ {頻道名稱} : {連結}」。

## 支援的圖片格式

- PNG - 支援 tEXt 和 zTXt chunks

## 開發說明

### 模組化結構

- `config.js` - 集中管理配置和環境��數
- `utils/metadata.js` - 處理圖片 metadata 解析
- `utils/embedBuilder.js` - 建構 Discord embed 訊息
- `utils/channelStorage.js` - 處理監聽頻道的持久化存儲
- `commands/index.js` - 處理斜線指令邏輯
- `services/` - **新增**：模組化網址轉換服務架構

### 新增網址轉換服務

機器人現在支援模組化的網址轉換服務架構。要新增新的服務（Instagram、TikTok 等）：

1. 建立新的服務目錄：`services/[服務名稱]/`
2. 按照 `services/twitter/twitterService.js` 的模式實作服務類別
3. 在 `services/index.js` 中註冊服務
4. 詳細說明請參考 `services/README.md`

### 新增功能

要新增功能時，請遵循模組化原則：
1. 將相關功能放在對應的模組中
2. 保持單一職責原則
3. 使用 `module.exports` 導出需要的函式

## 更新日誌 (Changelog)

### 版本 1.5.3 (2025-07-05)

*   **功能強化：** 移除了 YouTube 直播追蹤功能，專注於新影片通知。更新了相關指令和說明。
*   **功能強化：** 簡化了 Steam 特賣的嵌入訊息，移除了縮圖以提供更簡潔的視覺效果。

### 版本 1.5.2 (2025-07-03)

*   **問題修復：** 改善了 Twitter/X 影片連結的處理，當 `fxtwitter.com` 無法提供有效的影片 URL 時，會自動備援至 `vxtwitter.com`。
*   **優化：** 減少了主控台日誌的輸出量，以防止潛在的伺服器效能問題，僅保留必要的警告和錯誤訊息。

### 版本 1.5.1 (2025-07-03)

*   **功能強化：** 實現 Twitter/X 網址處理的自動備用機制。
*   **可靠性提升：** 當 fxtwitter API 失效或無法使用時，自動切換至 vxtwitter API 作為備用。
*   **數據相容性：** 自動數據格式轉換確保 API 間的無縫切換。
*   **錯誤處理：** 改進錯誤處理機制，包含超時保護和內容驗證。
*   **日誌記錄：** 增強日誌記錄以追蹤 API 使用情況和備用場景。
*   **架構更新：** 更新 `services/twitter/twitterUtils.js`，支援雙 API 和格式轉換工具。

### 版本 1.5.0 (2025-06-25)

*   **新增功能：** 新增 YouTube 頻道追蹤功能。
*   **功能強化：** YouTube 新影片和直播通知現在以純連結形式發送，格式為：「新的{直播/影片}上傳囉！ {頻道名稱} : {連結}」。
*   **指令變更：**
    *   `/youtube add` 現在需要 YouTube 頻道 ID。
    *   `/youtube remove` 現在需要 YouTube 頻道 ID。
    *   `/youtube list` 子指令已被移除。

### 版本 1.4.0 (2025-06-13)

*   **新增功能：** 新增 Steam 遊戲特賣通知功能。
*   **功能強化：** 實作每日自動抓取與推播 Steam 特賣資訊。
*   **架構改進：** 新增 `services/steam/` 用於 Steam API 整合，以及 `utils/steamStorage.js` 用於資料持久化。
*   **新增功能：** 新增 E-Hentai & ExHentai URL 轉換支援漫畫及插圖作品預覽。
*   **功能強化：** Pixiv 漫畫及插圖作品預覽。

### 版本 1.2.2 (2025-06-12)

*   **新增功能：** 完成多平台網址轉換系統，新增 PChome 24h購物支援。
*   **功能強化：** 全面支援 Twitter/X、Pixiv、PTT、Bilibili 和 PChome 網址偵測與處理。
*   **功能強化：** 各平台專屬的嵌入訊息格式，提供最佳使用者體驗。
*   **架構改進：** 擴展服務架構，為每個平台提供專用處理器。
*   **整合優化：** 統一網址轉換服務管理所有平台整合。

### 版本 1.2.0 (2025-06-11)

*   **重大重構：** 實作模組化網址轉換服務架構。
*   **新增功能：** Twitter/X 連結轉換，提供增強型嵌入訊息。
*   **新增功能：** 推文多圖片支援，在單一訊息中使用多個嵌入區塊。
*   **功能強化：** 自動抑制 Discord 的原生 Twitter 嵌入。
*   **功能強化：** 透過 fxtwitter 備用連結支援影片。
*   **架構改進：** 建立 `services/` 目錄，組織化網址轉換服務。
*   **架構改進：** 將 Twitter 相關工具移至 `services/twitter/`。
*   **架構改進：** 實作 `UrlConversionService` 統一網址處理。
*   **文件更新：** 新增完整的 `services/README.md` 服務開發指南。

### 版本 1.1.0 (2025-06-10)

*   **新增功能：** 新增透過愛心表情符號反應收藏圖片的功能。
*   **新增功能：** 新增「收藏圖片」右鍵應用程式集指令。
*   **功能強化：** 收藏的圖片現在會以美觀的嵌入式訊息格式透過私訊傳送，包含圖片本身及原始訊息連結，並使用 `#DDAACC` 顏色呈現。
*   **功能強化：** 放大鏡反應（用於查看 metadata）在私訊中不再包含原始訊息連結。
*   **優化：** 移除私訊中暫時性的「處理中」訊息（例如：「正在幫你提取圖片的資訊喔～請稍等一下！」），減少訊息量。
*   **錯誤修正：** 啟用在單一訊息中處理多個圖片附件的功能，無論是放大鏡（metadata 提取）還是收藏功能，確保所有圖片都能被處理。

## 授權

此專案僅供學習和個人使用。
