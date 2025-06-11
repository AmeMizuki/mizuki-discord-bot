[English](README.md) | [繁體中文](README.zh-TW.md)

# 曉山瑞希 Discord Bot

一個可愛的 Discord 機器人，專門用來提取和顯示圖片中的 Stable Diffusion metadata 資訊。

![image](https://github.com/user-attachments/assets/fbbe6a4a-2a9b-49ba-a1f9-36b992d0c039)

## 功能特色

- 🔍 自動監聽圖片並添加放大鏡表情符號
- ❤️ 自動監聽圖片並添加愛心表情符號
- 📊 提取並顯示 Stable Diffusion 參數（prompt、negative prompt、model 等）
- 💬 私訊回覆，保護用戶隱私
- ⚙️ 管理員可設定監聽頻道
- 💾 監聽頻道設定會持久化保存
- ⭐ 收藏圖片功能：使用者可以透過愛心表情符號反應或右鍵應用程式集指令（「Favorite Image」）來收藏圖片。收藏的圖片會以美觀的嵌入式訊息格式透過私訊傳送給使用者，其中包含圖片本身及原始訊息連結。
- 🎀 可愛的回應語氣

## 檔案結構

```
discordbot/
├── index.js                      # 主程式入口
├── config.js                     # 配置檔案
├── package.json                  # 依賴管理
├── .env                          # 環境變數（需自行創建）
├── monitored_channels.json       # 監聽頻道設定（自動生成，已加入 .gitignore）
├── monitored_channels.example.json # 監聽頻道設定範例
├── commands/
│   └── index.js                  # 斜線指令處理
└── utils/
    ├── metadata.js               # Metadata 解析工具
    ├── embedBuilder.js           # Discord Embed 建構工具
    └── channelStorage.js         # 頻道設定持久化工具
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

### 自動功能

1. 當有人在監聽頻道上傳圖片時，曉山瑞希會自動添加 🔍 和 ❤️ 表情符號。
2. 點擊 🔍 表情符號後，會收到包含圖片 metadata 的私訊（不含原始訊息連結）。
3. 點擊 ❤️ 表情符號或使用右鍵應用程式集指令「Favorite Image」後，會收到包含美觀圖片 Embed 及原始訊息連結的私訊。

## 支援的圖片格式

- PNG - 支援 tEXt 和 zTXt chunks

## 開發說明

### 模組化結構

- `config.js` - 集中管理配置和環境變數
- `utils/metadata.js` - 處理圖片 metadata 解析
- `utils/embedBuilder.js` - 建構 Discord embed 訊息
- `utils/channelStorage.js` - 處理監聽頻道的持久化存儲
- `commands/index.js` - 處理斜線指令邏輯

### 新增功能

要新增功能時，請遵循模組化原則：
1. 將相關功能放在對應的模組中
2. 保持單一職責原則
3. 使用 `module.exports` 導出需要的函式

## 更新日誌 (Changelog)

### 版本 1.1.0 (2024-07-26)

*   **新增功能：** 新增透過愛心表情符號反應收藏圖片的功能。
*   **新增功能：** 新增「收藏圖片」右鍵應用程式集指令。
*   **功能強化：** 收藏的圖片現在會以美觀的嵌入式訊息格式透過私訊傳送，包含圖片本身及原始訊息連結，並使用 `#DDAACC` 顏色呈現。
*   **功能強化：** 放大鏡反應（用於查看 metadata）在私訊中不再包含原始訊息連結。
*   **優化：** 移除私訊中暫時性的「處理中」訊息（例如：「正在幫你提取圖片的資訊喔～請稍等一下！」），減少訊息量。
*   **錯誤修正：** 啟用在單一訊息中處理多個圖片附件的功能，無論是放大鏡（metadata 提取）還是收藏功能，確保所有圖片都能被處理。

## 授權

此專案僅供學習和個人使用。 