# 曉山瑞希 Discord Bot

一個可愛的 Discord 機器人，專門用來提取和顯示圖片中的 Stable Diffusion metadata 資訊。

![image](https://github.com/user-attachments/assets/fbbe6a4a-2a9b-49ba-a1f9-36b992d0c039)

## 功能特色

- 🔍 自動監聽圖片並添加放大鏡表情符號
- 📊 提取並顯示 Stable Diffusion 參數（prompt、negative prompt、model 等）
- 💬 私訊回覆，保護用戶隱私
- ⚙️ 管理員可設定監聽頻道
- 🎀 可愛的回應語氣

## 檔案結構

```
discordbot/
├── index.js              # 主程式入口
├── config.js             # 配置檔案
├── package.json          # 依賴管理
├── .env                  # 環境變數（需自行創建）
├── commands/
│   └── index.js          # 斜線指令處理
└── utils/
    ├── metadata.js       # Metadata 解析工具
    └── embedBuilder.js   # Discord Embed 建構工具
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

## 使用方式

### 斜線指令

- `/finddata` - 上傳圖片查看 metadata
- `/setchannel` - 設定監聽頻道（僅管理員）
  - `action: 添加頻道` - 添加頻道到監聽清單
  - `action: 移除頻道` - 從監聽清單移除頻道
  - `action: 清空所有頻道` - 清空監聽清單
  - `action: 查看當前頻道` - 查看目前監聽的頻道

### 自動功能

1. 當有人在監聽頻道上傳圖片時，曉山瑞希會自動添加 🔍 表情符號
2. 點擊 🔍 表情符號後，會收到包含圖片 metadata 的私訊

## 支援的圖片格式

- PNG - 支援 tEXt 和 zTXt chunks

## 開發說明

### 模組化結構

- `config.js` - 集中管理配置和環境變數
- `utils/metadata.js` - 處理圖片 metadata 解析
- `utils/embedBuilder.js` - 建構 Discord embed 訊息
- `commands/index.js` - 處理斜線指令邏輯

### 新增功能

要新增功能時，請遵循模組化原則：
1. 將相關功能放在對應的模組中
2. 保持單一職責原則
3. 使用 `module.exports` 導出需要的函式

## 授權

此專案僅供學習和個人使用。
