[English](README.md) | [繁體中文](README.zh-TW.md) | [更新日誌](CHANGELOG.zh-TW.md)

***

# 曉山瑞希 Discord Bot

邀請機器人加入你的伺服器： [安裝瑞希 Bot](https://discord.com/oauth2/authorize?client_id=1381902438168264734)

一個可愛的 Discord 機器人，專門用來提取和顯示圖片中的 Stable Diffusion metadata 資訊，並支援多平台網址轉換和多圖片嵌入功能。

![image](https://github.com/user-attachments/assets/fbbe6a4a-2a9b-49ba-a1f9-36b992d0c039)

## 目錄

- [功能特色](#功能特色)
- [支援平台](#支援平台)
- [檔案結構](#檔案結構)
- [安裝與設定](#安裝與設定)
- [使用方式](#使用方式)
- [支援的圖片格式](#支援的圖片格式)
- [開發說明](#開發說明)
- [授權](#授權)

## 功能特色

- 📊 透過右鍵應用程式集指令（「檢查圖片資訊」）提取並顯示 Stable Diffusion 參數（prompt、negative prompt、model 等）
- 💬 私訊回覆，保護用戶隱私
- ⭐ **收藏圖片功能**：使用者可以透過右鍵應用程式集指令（「收藏圖片」）來收藏圖片。收藏的圖片會以美觀的嵌入式訊息格式透過私訊傳送給使用者，其中包含圖片本身及原始訊息連結。
- 🔗 **多平台網址轉換**：自動轉換各種平台連結為增強型嵌入訊息。
- 🖼️ **多圖片支援**：在單一訊息中使用多個嵌入區塊顯示支援平台的多張圖片。
- 💰 **Steam 特賣通知**：自動抓取並顯示 Steam 遊戲特賣資訊，並推播通知到指定頻道。
- 🎬 **影片轉 GIF**：透過右鍵應用程式集指令（「轉換為GIF」）將訊息中的影片轉換成 GIF。
- 🎀 可愛的回應語氣

## 支援平台

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

## 檔案結構

```
discordbot/
├── index.js                      # 主程式入口
├── config.js                     # 配置檔案
├── package.json                  # 依賴管理
├── .env                          # 環境變數（需自行創建）
├── commands/
│   ├── index.js                  # 斜線指令處理
│   ├── translateCommands.js      # /translate 斜線指令（推文翻譯連結）
│   ├── aiRankingCommands.js      # /ai-ranking 斜線指令（Artificial Analysis 排行榜）
│   └── gifCommands.js            # 「轉換為GIF」右鍵應用程式集指令
├── services/                     # 網址轉換服務
│   ├── index.js                  # 服務管理器
│   ├── gif/
│   │   └── gifService.js         # 透過 ezgif.com 將影片轉換成 GIF
│   ├── twitter/
│   │   ├── twitterService.js     # Twitter/X 網址處理
│   │   └── twitterUtils.js       # Twitter 工具函式
│   ├── pixiv/
│   │   └── pixivService.js       # Pixiv 作品網址處理
│   ├── bilibili/
│   │   └── bilibiliService.js    # Bilibili 影片/內容網址處理
│   ├── pchome/
│   │   └── pchomeService.js      # PChome 24h購物網址處理
│   ├── ehentai/
│   │   └── ehentaiService.js     # E-Hentai & ExHentai URL 處理
│   ├── facebook/
│   │   └── facebookService.js    # Facebook 網址處理（facebed.com）
│   ├── tiktok/
│   │   └── tiktokService.js      # TikTok 網址處理（tnktok.com）
│   ├── instagram/
│   │   └── instagramService.js   # Instagram 網址處理（oginstagram.com/zzinstagram.com）
│   ├── threads/
│   │   └── threadsService.js     # Threads 網址處理（FxThreads）
│   ├── artificialAnalysis/
│   │   └── artificialAnalysisService.js # Artificial Analysis 排行榜 API 與快取
│   └── README.md                 # 服務架構說明文件
└── utils/
    ├── metadata.js               # Metadata 解析工具
    ├── embedBuilder.js           # Discord Embed 建構工具
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
   AA_BENCHMARK_API=你的Artificial Analysis API金鑰
   ```

3. 啟動機器人：
   ```bash
   node index.js
   ```

## 使用方式

### 指令

| 指令 | 說明 |
| --- | --- |
| 右鍵訊息 → 「檢查圖片資訊」 | 將圖片的 metadata 透過私訊傳送給你。僅能手動觸發。 |
| 右鍵訊息 → 「收藏圖片」 | 將圖片以美觀的嵌入式訊息透過私訊傳送給你，並附上原始訊息連結。僅能手動觸發。 |
| 右鍵訊息 → 「轉換為GIF」 | 將訊息中的影片轉換成 GIF 並發布到頻道。 |
| `/translate` | 輸入推文連結（`x.com`、`twitter.com` 或 `fixupx.com`/`fixvx.com` 鏡像連結）與目標語言（`tw`、`cn`、`en`、`jp` 等）。 |
| `/ai-ranking` | 顯示 [Artificial Analysis](https://artificialanalysis.ai/) 的 AI 模型 Top 10，可依 `intelligence`、`coding`、`math` 或 `speed` 排序，並附上長條圖。同一模型只列出最高思考等級的版本。 |

### 自動功能

1. **多平台網址轉換**：當有人發送支援平台的連結時，機器人會：
   - 自動偵測來自 Twitter/X、Pixiv、Bilibili、PChome、Reddit、E-Hentai/ExHentai、Misskey、Facebook、TikTok、Instagram 和 Threads 的網址
   - 抑制 Discord 的原生嵌入以提供更佳呈現效果
   - 建立平台專屬格式的增強型嵌入訊息
   - 在處理失敗時提供備用連結

   各平台專屬行為：
   - **Twitter/X**：在多個嵌入區塊中顯示推文的多張圖片，GIF 以動態嵌入訊息呈現，影片則貼出預覽連結並附上嵌入訊息
   - **Pixiv**：顯示作品預覽與作者資訊
   - **Bilibili**：提供影片/內容預覽
   - **PChome**：顯示商品資訊包含圖片、名稱、價格和特色標語
   - **Misskey**：顯示筆記內容與適當格式化，包含圖片和影片
   - **Facebook**：轉換為 facebed.com 連結，並依頁面的 Open Graph 資料渲染隱藏網址的嵌入預覽
   - **TikTok**：轉換為 tnktok.com 連結；能取得預覽資料時渲染隱藏網址的嵌入預覽，否則直接貼出連結讓 Discord 播放影片
   - **Instagram**：轉換為 oginstagram.com 連結，當主網域無法連線時自動改用 zzinstagram.com，再依 Open Graph 資料渲染隱藏網址的嵌入預覽
   - **Threads**：透過 FxThreads 取得貼文資料並渲染成嵌入訊息——單張圖片直接顯示，多張圖片則採用 Discord gallery。

2. **Steam 特賣通知**：每日自動抓取最新的 Steam 遊戲特賣資訊，並發送通知到指定頻道。使用者也可以透過斜線指令手動查詢特賣資訊。

## 支援的圖片格式

- PNG - 支援 tEXt 和 zTXt chunks
- 右鍵圖片訊息 → **檢查圖片資訊**，機器人會將 metadata embed 私訊給你。
- **ComfyUI**：分別顯示正向／負面 prompt，並列出步數、CFG、Sampler、Scheduler、Seed、實際圖片大小、模型、LoRA 名稱與權重、VAE、upscaler model 與放大方法；欄位格式與 SDXL 相同。
- 優先使用 PNG 的執行 `prompt` 節點圖，依連線區分正負 prompt；只有 `workflow` 時讀取標準節點的 widgets 與 links。自訂節點應保留 `prompt` metadata，已移除 metadata 的圖片無法還原生成設定。
- 解析與 embed 檢查：`node utils/metadata.test.js`。

## 開發說明

### 模組化結構

- `config.js` - 集中管理配置和環境變數
- `utils/metadata.js` - 處理圖片 metadata 解析
- `utils/embedBuilder.js` - 建構 Discord embed 訊息
- `commands/index.js` - 處理斜線指令邏輯
- `services/` - **新增**：模組化網址轉換服務架構

### 新增網址轉換服務

機器人現在支援模組化的網址轉換服務架構。要新增新的服務：

1. 建立新的服務目錄：`services/[服務名稱]/`
2. 按照 `services/twitter/twitterService.js` 的模式實作服務類別
3. 在 `services/index.js` 中註冊服務
4. 詳細說明請參考 `services/README.md`

### 新增功能

要新增功能時，請遵循模組化原則：
1. 將相關功能放在對應的模組中
2. 保持單一職責原則
3. 使用 `module.exports` 導出需要的函式


## 授權

此專案僅供學習和個人使用。
