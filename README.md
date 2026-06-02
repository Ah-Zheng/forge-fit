# forge-fit 專案規劃藍圖 (Project Blueprint)

本藍圖已根據討論共識進行全面升級，確認採用現代化、模組化且高度工程化的開發架構：**「pnpm Monorepo + Turborepo + Vue 3 + Vite + TypeScript」**，並在前端應用中嚴格導入 **「Feature-Sliced Design (FSD)」** 代碼目錄組織規範。

此架構不僅能實現 **100% 離線優先 PWA** 與 **Google Drive 雲端備份**，還能透過 FSD 的嚴謹分層與單向依賴原則，提供極致的前端可讀性、組件高複用度以及型別安全保護。

---

## 一、 專案願景與核心定位 (已確認)

- **專案名稱**：`forge-fit` (鍛造健身)
- **核心標語**：_Forge Your Body, Track Your Progress, Architected with FSD._
- **核心價值**：
    - **PWA 本地優先 (Offline-First)**：所有訓練日誌與器材數據即時讀寫於本機 `LocalStorage` / `IndexedDB`，無訊號地下室健身房秒開使用。
    - **Google Drive 雲端自建備份 (Privacy-First Sync)**：使用者透過 Google OAuth 2.0 登入自己擁有的 Google 帳號，並將數據備份至自己雲端硬碟的專屬 `forge_fit_backup.json` 檔案中。
    - **人類化可讀架構 (Feature-Sliced Design)**：前端採用 FSD 規範，層次分明、單向依賴，徹底杜絕程式碼糾纏與混亂。
    - **科普親民化體驗 (Inclusive & Educational)**：在專業重訓數據旁加入「發光科普問號」，以淺顯易懂的語言向健身新手解釋訓練量的科學意義，降低專業門檻，提供鋼鐵成就感。
    - **Monorepo 多套件管理**：使用 `pnpm workspaces` 與 `Turborepo` 管理，將核心資料庫與 API 服務 (`packages/core`) 抽離，便於未來隨時擴充至其他平台。

---

## 二、 UI/UX 視覺與互動規範 (藍色調暗黑科技風)

視覺風格確認採用**「深靛藍/曜石黑」**背景，搭配發光的**「極光青」**與**「皇家藍」**霓虹點綴，營造極具專注感的科幻運動氛圍。

### 1. 色彩系統 (Color Tokens)

- **背景深色系**：
    - 主背景：`#080A10` (極深邃藍黑)
    - 面板與卡片背景：`rgba(18, 22, 36, 0.65)` (搭配毛玻璃 `backdrop-filter: blur(16px)` 特效)
- **霓虹發光色系**：
    - 極光青 (Neon Cyan)：`#00F0FF` (用於重點進度、核取狀態、PR 慶祝、選中導覽)
    - 科技皇家藍 (Royal Blue)：`#2F80ED` (用於主要按鈕、一般進度條、圖表主色)
- **狀態與中性色**：
    - 成功綠色：`#00FF87` (用於狀態標籤，具呼吸燈效果)
    - 警告紅色：`#FF4A4A` (用於刪除、重置)
    - 文字主色/次色：`#E2E8F0` (冰冷白) / `#94A3B8` (冷灰色)

### 2. 手機版觸控與 PWA 介面優化

- **底部固定導覽列 (Bottom Nav Bar)**：提供「看板」、「重量紀錄」、「動作庫」與全新的「設定備份 (Settings)」頁面。
- **觸控步進器 (Stepper Input)**：重量點擊 `+` / `-` 增減 `2.5 kg`；次數點擊 `+` / `-` 增減 `1 reps`，避免虛擬鍵盤干擾。

---

## 三、 已確定之功能模組詳細規劃 (Detailed Functional Specifications)

為確保專案極具人類可讀性，並方便進行問題對照與調整，以下對 5 大核心功能模組進行最詳盡的場域與運作規範定義：

### 1. PWA 離線引擎 (Service Worker & Manifest)

- **使用者場景**：你走進一間位於地下室、完全沒有網路訊號的健身房，打開手機瀏覽器，開啟 `forge-fit` 網頁。
- **詳細互動細節**：
    - **離線秒開 (App Shell Caching)**：第一次在有網路處開啟網頁時，Service Worker 會在手機瀏覽器背景，將網頁所有的結構 (`index.html`)、藍色暗黑樣式 (`style.css`)、核心邏輯 (`app.js`) 與圖示全部下載儲存。下次在地下室打開時，完全不走網路，直接從本機讀取，**達成像原生 App 一樣的「秒開」速度**。
    - **全螢幕安裝體驗 (Standalone Display)**：當您在手機瀏覽器點選「新增至主畫面」後，手機桌面會出現一個我們設計的發光藍色啞鈴 icon。從桌面點擊啟動時，**網頁網址列、上一頁、下一頁等瀏覽器框線會完全消失**，呈現出完美的滿版 App 質感。
    - **安全區適配 (Safe Area Inset)**：App 頂部狀態欄（手機電量、時間）會自動與我們的曜石黑主題融合，且底部會自動留出 iPhone Home 橫條的避讓高度，學術性地避開安全區，絕不遮擋我們的底部導覽列。
- **背後運作邏輯**：
    - 註冊 `/sw.js` 服務工作執行緒，攔截所有 Fetch 請求。採用「快取優先 (Cache-First)」策略讀取靜態資源，若快取未命中則回退至網路請求 (Network Fallback)。
    - 透過 `/manifest.json` 定義 `display: "standalone"`, `orientation: "portrait-primary"`, 並註冊 `logo.svg` 作為 `maskable` icon 以支援所有 Android/iOS 桌面自訂剪裁。

### 2. LocalStorage 本地數據庫 (Offline-First Storage)

- **使用者場景**：你正在揮汗如雨地做完一組 100 kg 深蹲，單手在 App 紀錄了數據，接著手機突然因為沒電自動關機，或者你不小心把 App 分頁滑掉關閉。
- **詳細互動細節**：
    - **微秒級即時存檔 (Reactive Auto-Save)**：每次您點擊 `+` / `-` 調整數值，或勾選「完成組數」時，Vue 3 的響應式狀態會自動觸發 Core 模組，在**微秒級（小於 1 毫秒）**之內將當前所有訓練數據更新至本機的 `LocalStorage`，**完全不需要使用者手動點擊「儲存」按鈕**。
    - **無痛復原 (Zero-Data-Loss)**：當您重開手機、重開網頁時，原本輸入的所有組數、重量、勾選狀態，全部都會在 0.01 秒內恢復原狀，完全沒有遺失紀錄的焦慮。
    - **日誌結構規劃 (Date-Keyed Storage)**：數據庫會以日期（例如 `2026-06-01`）作為唯一 Key 來存儲當天日誌。這代表您可以自由切換日期，查看昨天的紀錄，數據完全獨立，不會互相覆蓋。
- **背後運作邏輯**：
    - 封裝 `LocalStorage` 讀寫邏輯至 `packages/core/src/db` 下。
    - 每次 Vue 的反應式 state (例如 `workoutDayState`) 發生 mutation 時，觸發 side effect 將狀態序列化為 JSON 字串存入 `localStorage.setItem('forge-fit-data', JSON.stringify(...))`。
    - 限制初始化時在 `App.vue` 載入期執行 `try-catch` 解析本地 JSON 檔案，以防損毀，若無資料則初始化為預設的空白結構。

### 3. 訓練看板模組 (Dashboard)

- **使用者場景**：你剛結束一天的鍛鍊，想要知道今天累積的訓練總量、完成了多少組，並看看自己今天是否有鍛鍊均衡。
- **詳細互動細節**：
    - **三大統計指標卡 (Core Metrics)**：
        1.  **今日總訓練量 (Volume)**：自動加總今天所有「已勾選完成」的 `重量 × 次數` 總和（例如：臥推 60kg x 10下 x 3組 = 1800kg，這 1800kg 就會計入總量）。
        2.  **今日完成組數 (Sets)**：顯示今天完成的總組數，讓你直觀感受今天的訓練密度。
        3.  **運動時長 (Duration)**：顯示今日鍛鍊的累積分鐘數。
    - **數據科普說明書 (Science Tooltip - 新增 💡)**：
        - 在「訓練總量」字樣旁，設計一個發光的極光青色微小問號 `?` 按鈕。
        - **點擊/觸控時**，彈出一個高質感的毛玻璃氣泡提示框（Popover），向使用者解釋：
            - _公式_：`重量 × 次數 × 組數`。
            - _科學意義_：這是健身科學中最重要的「漸進性超負荷」指標。只要這項數值隨著時間穩定上升，代表你的肌肉正在變強。
            - _精神象徵_：代表你今天累積舉起的鋼鐵總重量，是汗水與成就感的具體呈現！
    - **動態肌群分佈圖 (Interactive Doughnut Chart)**：
        - 採用 **Chart.js** 繪製一個精美的環形圓餅圖。
        - **這是完全即時反應的**：當你在「重量紀錄」頁面勾選完成一組背部拉伸，切換回「看板」時，背部的比例就會在 0.5 秒內流暢地重新跑出動畫並增加比例。這能提醒健身者是否有「過度練胸，嚴重忽略練背」的體態失衡危機。
- **背後運作邏輯**：
    - `packages/core` 中設有資料解析器 (Parser)，當今日日誌發生變化時，會執行過濾：`completed === true` 的組數。
    - 按動作之 `primaryMuscle` 標籤分組累加各自組數或總重量，並以 `Ref` 拋出給 Vue Component。
    - Vue 頁面監聽該數據，並呼叫 `chartInstance.update()` 進行就地重繪與動態渲染，避免整頁刷新。
    - 科普 Tooltip 採用 Vue 響應式佈局，利用 `ref(false)` 控制顯示隱藏，並在點擊彈窗外側時自動關閉，以獲得最佳的行動端體驗。

### 4. 重量紀錄模組 (Logger)

- **使用者場景**：你心跳加速、手很痠地站在槓鈴前，想要快速紀錄剛剛做完的一組槓鈴臥推，接著進行組間休息。
- **詳細互動細節**：
    - **單手步進器 (Tactile Steppers)**：
        - 每個重量與次數欄位兩側都有超大、極易點擊的 `-` 與 `+` 按鈕。
        - **重量每點擊一次調整 `2.5 kg`**（符合健身房最小槓片單位設定）；**次數每點擊一次調整 `1 reps`**。輸入框本身為唯讀，手汗時完全免除彈出手機鍵盤的干擾，用大拇指輕點即可。
    - **智慧組數記憶 (Smart Set Copier)**：
        - 點擊「新增組數」時，App 會**自動複製上一組的重量與次數**。因為大部分健身者每組的重量是一樣的，所以你只需點「新增組數」➡️「勾選完成」，**整個過程只需點擊兩次、耗時一秒，就完成了新的一組紀錄！**
    - **霓虹核取視覺 (Completed Highlight)**：
        - 當勾選 checkbox 完成時，整行數據會亮起代表完成的極光青色霓虹背景；當該動作的所有組數都完成時，動作卡片的外框會泛起淡淡的藍色微光。當天所有動作全部勾選完畢時，會灑落發光的青藍色粒子雨。
- **背後運作邏輯**：
    - `<TactileStepper />` 作為 FSD `shared/ui` 元件，接收 `value` 與 `step` 作為 Prop，並透過 `emits` 傳遞更新值給父組件。
    - 新增組數時，由 `apps/web/src/features/add-set` 執行 Array push 操作，動態讀取 `exercise.sets[sets.length - 1]` 的屬性值作為預設。
    - 偵測所有 checkbox 的 `.every(set => set.completed === true)` 狀態，若為真，則調用 canvas 粒子發射器啟動特效。

### 5. 動作百科常用庫 (Encyclopedia)

- **使用者場景**：你今天想練腿，想快速把「槓鈴深蹲」加入到今天的訓練日誌中，或者你想自訂一個自己的私房動作。
- **詳細互動細節**：
    - **常用清單一鍵快加 (Quick-Add)**：
        - 百科中會列出常見的健身動作（如深蹲、臥推、硬舉、側平舉）。
        - 每個動作右側都有一個發光的青色 `+` 按鈕，點擊後，這個動作會**自動加入今日的重量日誌中**，並自動將頁面切換到「重量紀錄」分頁，讓你立刻開始點擊紀錄，沒有任何阻礙。
    - **自訂新動作 (Add Custom Exercise)**：
        - 如果內建庫沒有你想要的動作，你可以點擊「新增訓練動作」按鈕，在彈出的玻璃感 Modal 視窗中輸入名稱，並選定它的主肌群（胸、背、腿、肩、臂），這個動作就會**永久保存在你的個人動作庫中**，未來都可以一鍵快加。
- **背後運作邏輯**：
    - 在 `packages/core` 中建立動作目錄字典 (Exercise Dictionary)。
    - 快加按鈕觸發 `addExerciseToSession(exerciseId)` 函數，背後會往當前 `session.exercises` 數組中 `push` 一個包含單一預設組數的全新資料物件，隨後在 Vue 內修改 `currentTab.value = 'logger'` 進行視圖自動導航切換。
    - 使用者自訂的新動作會存存放在本地 `exercisesLibrary` JSON 陣列中，與預設百科合併渲染，並一同備份至雲端。

---

## 四、 Monorepo 與 Feature-Sliced Design (FSD) 目錄結構

```text
forge-fit/
├── apps/
│   └── web/                   # Vue 3 + Vite + TypeScript PWA 主應用程式 (FSD 規範)
│       ├── src/
│       │   ├── app/           # 1. 全局初始化 (樣式、PWA 註冊、Pinia)
│       │   ├── pages/         # 2. 獨立分頁 (DashboardPage, LoggerPage, LibraryPage, SettingsPage)
│       │   ├── widgets/       # 3. 大型高複用區塊 (VolumeChartWidget, WorkoutLoggerCard)
│       │   ├── features/      # 4. 行動/功能層 (add-set-stepper, auth-by-google, trigger-sync)
│       │   ├── entities/      # 5. 業務領域實體 (workout-session, exercise, user-profile)
│       │   └── shared/        # 6. 公共複用層 (ui-kit 按鈕、api 客戶端、utils 工具)
│       ├── index.html
│       ├── vite.config.ts
│       └── public/            # manifest.json、logo.svg、sw.js 離線引擎
├── packages/
│   ├── core/                  # 核心數據處理包 (跨平台共享)
│   │   ├── src/
│   │   │   ├── db/            # LocalStorage / IndexedDB 資料庫封裝
│   │   │   ├── drive/         # Google Drive API 串接與備份邏輯
│   │   │   └── index.ts       # 導出核心服務
│   │   └── package.json
│   └── types/                 # 統一的 TypeScript 型別定義
│       ├── index.d.ts
│       └── package.json
├── package.json               # Monorepo 根目錄配置
├── pnpm-workspace.yaml        # pnpm 工作區設定
├── turbo.json                 # Turborepo 構建管線與快取設定
└── README.md                  # 本專案規劃藍圖
```

---

## 五、 技術選型決策 (已確認)

- **套件與工作區管理**：pnpm (工作區) + Turborepo。
- **前端框架與架構**：Vue 3 (Composition API) + Vite + TypeScript + Feature-Sliced Design (FSD)。
- **資料庫與備份引擎**：LocalStorage + Google Identity Services (GIS) & Google Drive API。

---

## 六、 推薦開發路徑 (Roadmap)

1. **Step 1: 初始化 Monorepo 骨架與 FSD 目錄 [已完成]**
    - 建立 `pnpm-workspace.yaml`、`turbo.json`、根目錄 `package.json`、`.gitignore`。
    - 初始化 `apps/web` (Vue 3 + TS + Vite) 並建立 FSD 結構，寫好分頁響應式路由。
2. **Step 2: 核心功能移植與 Vue 3 組件化 [待進行]**
    - 將 Prototype 中的 HTML/CSS 移植為 Vue 3 響應式組件（如 `<TactileStepper />`、`<DashboardChart />`）。
    - 移植 Chart.js 動態圓餅圖與 Confetti 慶祝特效。
3. **Step 3: packages/core 資料庫持久化與業務抽離 [待進行]**
    - 在 `packages/core` 中撰寫型別安全的 LocalStorage 讀寫服務，並於 Vue App 中進行依賴注入。
4. **Step 4: Google Drive API 備份模組實作與設定分頁開發 [待進行]**
    - 實作 `trigger-sync` 功能，串接 `GIS` 帳號綁定，完成雲端備份。
5. **Step 5: PR 突破紀錄與歷史成長圖表擴充 [待進行]**
    - 擴充動作極限與折線圖歷史追蹤。
