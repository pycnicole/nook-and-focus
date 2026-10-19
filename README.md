# 🕯️ Nook & Focus — 深夜書房與個人專注空間

> **Personal Study Desk & Literary Bookshelf**  
> 一個結合「番茄鐘專注工具」、「環境白噪音混音器」與「個人數位書架」的極簡單頁式網頁應用程式（SPA）。

---

## ✨ 專案簡介 (Overview)

**Nook & Focus** 旨在打造一個零干擾、具沉浸感與文學溫度的數位桌面。  
在日常讀書或寫程式時，左側的**專注讀書台**能作為實用的時間管理與白噪音陪伴工具；休息時，右側的**私人慢活書架**則能用來紀錄讀過、在讀與想看的書籍與個人閱讀筆記。

### 核心設計亮點
1. **免版權疑慮的視覺與音訊設計**：
   - **CSS 3D 概念書背（Conceptual Book Spines）**：不依賴外部有版權疑慮的出版社書封圖片，使用純 CSS 內陰影、直排思源宋體（`writing-mode: vertical-rl`）與木質層架渲染出立體書櫃，支援滑鼠懸停抽出動畫。
   - **Pixabay 免費授權環境音**：四種環境音皆採用 [Pixabay](https://pixabay.com/) 免費授權音訊素材（`assets/audio/*.mp3`），以 HTML5 Audio 循環播放；番茄鐘結束提示音則透過 Web Audio API（`AudioContext` + `OscillatorNode`）即時合成 528Hz 頌缽音。
2. **無後端依賴的資料持久化（Data Persistence）**：
   - 採用 `window.localStorage` 儲存今日專注統計、待辦事項清單、自訂書架館藏與書櫃門開關狀態，關閉或重新整理瀏覽器後資料依然完整保留。
   - 「今日專注分鐘數」會記錄所屬日期，跨日後自動歸零。

---

## 🛠️ 功能模組 (Features)

### 0. 頁首資訊列 (Header)
- 顯示今日日期與「今日專注：X mins」累計統計。

### 1. 專注讀書台 (Focus Desk)
- **番茄鐘計時器 (Pomodoro Timer)**：
  - 支援「專注 (25m)」、「短休 (5m)」、「長休 (15m)」三種模式切換，可開始／暫停／重置。
  - 搭配 SVG 圓形進度條動態倒數，並於瀏覽器分頁標題（`<title>`）即時同步顯示剩餘時間。
  - 倒數結束時發出 528Hz 柔和頌缽提示音；專注模式完成後自動累計「今日專注分鐘數」（每日自動歸零）。
- **環境白噪音混音器 (Ambient Sound Mixer)**：
  - 提供四種環境音：窗外微雨、壁爐柴火、深夜咖啡館、翻書與書寫。
  - 支援多軌同時播放與獨立音量滑桿（0% ~ 100%）自由混音，並提供一鍵「全部靜音」功能。
- **今日待辦與閱讀目標 (Daily To-Do List)**：
  - 支援新增任務、勾選完成（自動更新完成比例）與單項刪除。

### 2. 私人慢活書架 (Personal Bookshelf)
- **書櫃雙開木門**：預設為闔上狀態以減少專注時的視覺干擾，可點擊門板或「打開／關上書櫃門」按鈕切換，開關狀態會被記憶。
- **狀態分類篩選**：支援依「全部館藏」、「閱讀中」、「已讀完」、「想看清單」即時篩選書櫃，底部同步顯示目前顯示數量與總館藏數。
- **書籍筆記檢視 (Book Detail Modal)**：點擊任一立體書背，即可展開彈出視窗檢視作者、閱讀狀態與個人閱讀筆記，並可「編輯」書籍資料或將書籍從書架移除。
- **上架新書 (Add Book Modal)**：點擊「＋ 放上一本書」可自訂書名、作者、閱讀狀態、挑選 6 款深夜書房代表色與撰寫筆記，系統將隨機生成自然錯落的書背高度與寬度並擺上木架。

---

## 🧱 技術架構 (Tech Stack)

- **結構 (Markup)**：HTML5 Semantic Elements
- **樣式 (Styling)**：Tailwind CSS (via CDN) + Custom CSS3 (Flexbox, Grid, Writing Mode, Box Shadow)
- **字體與圖示 (Typography & Icons)**：
  - Google Fonts：`Inter` (UI 與等寬數字)、`Noto Serif TC 思源宋體` (書名與標題)
  - 圖示庫：Lucide Icons
- **邏輯與音訊 (Logic & Audio)**：Vanilla JavaScript (ES6+)、HTML5 Audio（環境音播放）、Web Audio API（提示音合成）、`localStorage`
- **音訊素材 (Audio Assets)**：Pixabay 免費授權音訊

---

## 📂 目錄結構 (Project Structure)

```text
nook-and-focus/
├── index.html          # 主畫面結構與彈出視窗 (Modals)
├── assets/
│   └── audio/          # 環境音素材 (rain / fire / cafe / pages.mp3，來源：Pixabay)
├── css/
│   └── style.css       # 自訂 CSS (立體書背、木質層架、書櫃木門、音量滑桿與動畫)
├── js/
│   ├── data.js         # 預設資料層 (環境音配置；預設書單與待辦為空)
│   └── app.js          # 核心狀態管理、番茄鐘、音訊播放、資料儲存與 DOM 渲染邏輯
└── README.md           # 專案說明文件
```
