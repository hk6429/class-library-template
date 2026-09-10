# 班級圖書借用與閱讀分析系統 (Class Library & Deep Reading Analytics)

> 專為中小學班級設計的輕量級圖書館借還與閱讀素養分析系統。支援手機鏡頭即時掃描書籍 ISBN 條碼、學生名冊下拉選單、完整借還書登記，並透過 Chart.js 提供學生個人閱讀偏好雷達圖、閱讀人格標籤與全班借閱大數據分析！

[![Netlify Status](https://api.netlify.com/api/v1/badges/class-library-template/deploy-status)](https://class-library-template.netlify.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## 🌟 核心特色

### 1. 📱 手機鏡頭掃描 ISBN 條碼
- 整合 `html5-qrcode` 函式庫，免安裝任何 App，直接在手機瀏覽器啟用相機鏡頭對焦條碼。
- 支援 EAN-13 (978 開頭國際標準書號 ISBN-13)、UPC 等主流條碼。
- 連線 Google Books API 自動帶出中文書名、作者、出版社、分類與書籍封面，亦內建離線常備書庫作為備援。

### 2. 👥 學生名冊管理與下拉選單選擇
- 支援批次貼上座號與姓名（例如：`01 王小明`），一鍵即時解析儲存。
- 借書介面提供人性化下拉選單，即時提示該生「目前在借本數」與「累計借閱次數」。
- 預載 801 班 30 位學生示範名冊，開箱即刻體驗。

### 3. 🔄 借書與還書完整流暢操作
- **快速借書**：選學生 ➔ 掃條碼（或手動輸入 ISBN）➔ 書籍封面即時預覽 ➔ 設定借閱天數（7/14/21天）➔ 確認登記（伴隨音效與震動回饋）。
- **快速還書**：
  - 掃描書籍條碼：系統自動鎖定在借中的紀錄，單鍵確認歸還。
  - 在借清單操作：在「目前在借清單」中直接搜尋學生或書名，點選「還書」並發射慶祝彩花（Canvas Confetti）。

### 4. 📊 學生借閱情況與大數據閱讀分析
- **個別學生閱讀畫像**：
  - 追蹤個人總借閱本數、目前在借、準時歸還率與班級閱讀排名。
  - **六大領域閱讀雷達圖 (Radar Chart)**：文學小說、科普探索、歷史人文、心理勵志、科幻奇幻、漫畫圖文。
  - **偏好領域百分比 (Doughnut Chart)**。
  - **AI 閱讀人格標籤**（例如：`🔬 科學探險先鋒`、`📖 文學心靈漫遊者`、`📜 歷史古今思辨家`、`🌱 自我成長實踐者`、`🚀 異想宇宙領航員`、`🎨 圖像美感鑑賞家`）。
  - **教師導讀與適性推薦方向**。
  - **個人近期閱讀足跡時間軸**。
- **全班閱讀宏觀風雲榜**：
  - 班級借閱之星 Top 5。
  - 班級熱門搶手書 Top 5。
  - 全班六大領域借閱分佈長條圖 (Bar Chart)。

### 5. 🤖 Google Apps Script (GAS) 與 LINE Bot 雙向串接
- 提供完整 `Code.gs` 後端程式碼，可直接貼入 Google 試算表指令碼編輯器。
- 支援 Google Sheets 作為雲端資料庫（自動生成藏書清單、學生名冊、借還紀錄、系統設定）。
- LINE Bot 支援指令查詢（例如：`借書`、`我的借閱 05`、`閱讀榜`、`排行榜`），並回傳精美 LINE Flex 訊息卡片！

---

## 🚀 快速開始

### 本地直接執行 (前端免安裝)
直接以瀏覽器開啟專案目錄中的 `index.html` 即可使用完整功能：
```bash
open index.html
```

### 部署至 Netlify
本專案為標準靜態 SPA 網頁，可直接拖拉或透過 Netlify CLI 一鍵上線：
```bash
netlify deploy --prod --dir=.
```

---

## 📂 專案架構

```
class-library-template/
├── index.html           # 完整前端單頁應用程式 (含掃描器、Chart.js 分析圖表、借還書工作台)
├── Code.gs              # Google Apps Script 雲端試算表後端與 LINE Bot Webhook 核心程式
├── build_site.py        # 靜態站點組裝與程式碼內嵌腳本
├── README.md            # 專案說明與部署指南
├── LICENSE              # MIT 授權條款
└── .gitignore
```

---

## 🛠️ Google 試算表與 LINE Bot 設定步驟

1. 建立一個新的 Google 試算表。
2. 點選選單「擴充功能」>「Apps Script」。
3. 將本專案中的 `Code.gs` 完整內容貼上。
4. 選擇函數 `initializeSpreadsheet` 並點選「執行」，試算表將自動建置 4 張資料表與範例書籍。
5. 點選右上角「部署」>「新的部署作業」：
   - 種類選「網頁應用程式 (Web App)」
   - 執行身分選「我」
   - 誰可以存取選「所有人」
6. 複製取得的 Web App 網址，至 LINE Developers Console 貼入 Messaging API 的 Webhook URL 並開啟 Use Webhook。

---

## 📄 授權條款
MIT License
