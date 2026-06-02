# forge-fit 專案技術文件 (Project Documentation)

本文件已根據實際開發進度全面更新，確認採用現代化、模組化且高度工程化的開發架構：**「pnpm Monorepo + Turborepo + Vue 3 + Vite + TypeScript」**，並在前端應用中嚴格導入 **「Feature-Sliced Design (FSD)」** 代碼目錄組織規範。

此架構已成功實現 **100% 離線優先 PWA** 與 **Google Drive 雲端備份（含真實 OAuth 2.0 與沙盒雙軌模式）**，並透過 FSD 的嚴謹分層與單向依賴原則，提供極致的前端可讀性、組件高複用度以及型別安全保護。

---

## 一、 專案願景與核心定位

- **專案名稱**：`forge-fit` (鍛造健身)
- **核心標語**：_Forge Your Body, Track Your Progress, Architected with FSD._
- **核心價值**：
    - **PWA 本地優先 (Offline-First)**：所有訓練日誌與器材數據即時讀寫於本機 `LocalStorage`，無訊號地下室健身房秒開使用。
    - **Google Drive 雲端自建備份 (Privacy-First Sync)**：使用者透過 Google OAuth 2.0 登入自己擁有的 Google 帳號，並將數據備份至自己雲端硬碟的專屬 `forge_fit_backup.json` 檔案中。支援真實 OAuth 與沙盒模擬雙軌模式。
    - **人類化可讀架構 (Feature-Sliced Design)**：前端採用 FSD 規範，層次分明、單向依賴，徹底杜絕程式碼糾纏與混亂。
    - **科普親民化體驗 (Inclusive & Educational)**：在專業重訓數據旁加入「發光科普問號」，以淺顯易懂的語言向健身新手解釋訓練量的科學意義，降低專業門檻，提供鋼鐵成就感。
    - **Monorepo 多套件管理**：使用 `pnpm workspaces` 與 `Turborepo` 管理，將核心資料庫與 API 服務 (`packages/core`) 抽離，便於未來隨時擴充至其他平台。

---

## 二、 UI/UX 視覺與互動規範 (藍色調暗黑科技風)

視覺風格採用**「深靛藍/曜石黑」**背景，搭配發光的**「極光青」**與**「皇家藍」**霓虹點綴，營造極具專注感的科幻運動氛圍。

### 1. 色彩系統 (Color Tokens)

- **背景深色系**：
    - 主背景：`#080A10` (極深邃藍黑)
    - 面板與卡片背景：`rgba(18, 22, 36, 0.65)` (搭配毛玻璃 `backdrop-filter: blur(16px)` 特效)
- **霓虹發光色系**：
    - 極光青 (Neon Cyan)：`#00F0FF` (用於重點進度、核取狀態、PR 慶祝、選中導覽)
    - 科技皇家藍 (Royal Blue)：`#2F80ED` (用於主要按鈕、一般進度條、圖表主色)
    - 紫羅蘭 (Purple)：`#9B5DE5` (用於腿部肌群圖表、運動時長指標)
    - 霓虹粉 (Magenta)：`#F15BB5` (用於肩膀肌群圖表)
    - 螢光黃 (Yellow)：`#FEE440` (用於手臂肌群圖表)
- **狀態與中性色**：
    - 成功綠色：`#00FF87` (用於狀態標籤，具呼吸燈效果)
    - 警告紅色：`#FF4A4A` (用於刪除、重置)
    - 文字主色/次色：`#E2E8F0` (冰冷白) / `#94A3B8` (冷灰色)

### 2. 響應式導覽與觸控互動設計 (已實現)

- **手機版底部固定導覽列 (5 欄 Moze 記帳風 Bottom Nav)**：
    - `[看板]` `[探索(佔位)]` `(日誌/＋ 動態中心按鈕)` `[百科]` `[設定]`
    - 正中間為凸出式霓虹呼吸發光的**動態雙態按鈕**：在日誌頁面顯示 `＋` (一鍵喚起就地動作挑選抽屜)；在其他頁面顯示 `📋` (一鍵導航至日誌頁面)。
    - 「探索」為半透明佔位預留按鈕 (指南針圖示)，功能即將開放。
- **手機版左滑側邊抽屜 (Hamburger Drawer)**：點擊頂部漢堡按鈕拉出，毛玻璃背景、霓虹邊框、科技風滑出動畫，與桌上版側邊選單完美對應。
- **桌上版固定側邊選單 (Sidebar Widget)**：260px 寬度永駐左側，4 個分頁按鈕 + 底部用戶等級展示，品牌 Logo 帶霓虹發光呼吸動畫。
- **響應式雙端自動切換 (PC/Mobile Split Layout)**：透過 `useMediaQuery('768px')` 媒體查詢，在 PC 端自動銷毀底部導覽列 / 在行動端自動銷毀側邊選單，達成 100% DOM 冗餘消除。
- **PC 端 30%/70% 雙欄分割佈局**：日誌頁面與百科頁面在 `min-width: 1024px` 斷點下，自動切換為左側 30% 控制面板 + 右側 70% 內容區的黃金比例分割。
- **觸控步進器 (TactileStepper)**：重量點擊 `+` / `-` 增減 `2.5 kg`；次數點擊 `+` / `-` 增減 `1 reps`，支援 Pointer 長按連續增減 (400ms 啟動、80ms 間隔高速跳動)，避免虛擬鍵盤干擾。

---

## 三、 已實現之功能模組詳細規格 (Detailed Functional Specifications)

### 1. PWA 離線引擎 (Service Worker & Manifest) ✅ 已實現

- **離線秒開 (App Shell Caching)**：`/manifest.json` 已配置 `display: "standalone"`, `orientation: "portrait-primary"`，並註冊 `logo.svg` 作為 `maskable` icon。
- **全螢幕安裝體驗**：手機瀏覽器「新增至主畫面」後呈現完美的滿版 App 質感，網址列完全消失。
- **安全區適配 (Safe Area Inset)**：CSS 已包含 `padding-bottom: env(safe-area-inset-bottom)` 及 `100dvh` 動態視窗高度處理。
- **PWA Shortcut**：支援從主畫面圖示直接快捷跳轉至「今日重量紀錄」。

### 2. LocalStorage 本地數據庫 (Offline-First Storage) ✅ 已實現

- **微秒級即時存檔 (Reactive Auto-Save)**：透過 Vue 3 的 `watch(..., { deep: true })` 深層監聽日誌狀態，每次重量、次數、完成狀態或新增組數的變更，都會自動在微秒級將數據存入 `LocalStorage`，**完全不需要手動點擊「儲存」按鈕**。
- **無痛復原 (Zero-Data-Loss)**：重開手機、重開網頁時，所有數據在 0.01 秒內恢復原狀。
- **日期鍵值存取 (Date-Keyed Storage)**：使用 `workout:YYYY-MM-DD` 格式的 Key 存取各日日誌。
- **型別安全資料庫服務**：`packages/core/src/db/dbService.ts` 封裝了完整的 `initDatabase`、`getWorkoutByDate`、`saveWorkout`、`getAllWorkouts`、`getExercisesLibrary`、`addCustomExercise`、`updateExerciseLoadRecord` 等 API。

### 3. 訓練看板模組 (DashboardPage) ✅ 已實現

- **三大統計指標卡 (Core Metrics)**：
    1.  **今日總訓練量 (Volume)**：自動加總所有「已勾選完成」組數的 `重量 × 次數`，附千分位格式化。
    2.  **今日完成組數 (Sets)**：即時統計已完成的總組數。
    3.  **運動時長 (Duration)**：以 Garmin/Apple Watch 風格的跑錶格式 (`HH:MM:SS` / `MM:SS`) 顯示，附 **LIVE 動態呼吸徽章** (計時器運行時亮起霓虹脈搏動畫)。
- **數據科普說明書 (Science Tooltip)**：
    - 在「今日總訓練量」旁設有發光極光青問號按鈕，點擊展開高質感毛玻璃 Popover，解釋公式 (`重量 × 次數 × 組數`)、漸進性超負荷的科學意義，以及汗水與成就感的象徵。
- **動態肌群分佈環形圖 (Chart.js Doughnut)**：
    - 即時反應的 Chart.js 響應式環形圖，含五大肌群 (胸/背/腿/肩/臂) 霓虹配色。
    - **零數據空狀態**：顯示暗灰占位圓環與「煉鐵中 / 尚無紀錄」提示。
    - **有數據狀態**：中心發光顯示今日總負荷 (超過 1000kg 自動轉換為 `X.Xt` 噸顯示)。
    - 客製化發光 HTML 圖例，帶百分比與動態透明度引導視覺焦點。

### 4. 重訓時光日誌模組 (LoggerPage) ✅ 已實現

- **可摺疊式時光日曆 (Collapsible Grid Calendar)**：
    - 行動端預設為**單週週曆** (節省過半版面)，點擊 Chevron 可展開為**整月月曆**；PC 端固定以整月月曆呈現。
    - 日曆格上帶有**發光訓練指示點**：有訓練紀錄的日期亮起極光青呼吸圓點。
    - 支援**月/週導航切換** (`< >`)、**「今日」快速回跳按鈕**、**日期點選切換日誌** (可回溯補記任意歷史日期)。
    - 智慧日曆網格演算法：動態判斷 35 天或 42 天，完美消除多餘空行。
- **運動計時秒錶 (Timer/Stopwatch)**：
    - 毛玻璃科技風時長主控條 (Glassmorphic Timer Bar)，嵌入於日誌左欄。
    - 支援**播放/暫停**、**手動微調 ±5 分鐘**。
    - **時間戳背景補償引擎**：記錄 `timerStartedAt` 時間戳，當使用者切桌面、關螢幕、甚至重啟 PWA 後，利用 `Date.now() - timerStartedAt` 純數學差值一次性補償背景時間，達成 100% 零丟失精度。
    - 透過 Visibility API 監聽，前台返回時瞬間同步。
- **單手觸控步進器 (TactileStepper)**：FSD `shared/ui` 層的高複用元件，支援長按 Pointer 連續增減。
- **智慧組數記憶 (Smart Set Copier)**：新增組數時自動複製上一組的重量與次數；若是動作的第一組，則自動帶入百科常用負荷紀錄。
- **霓虹核取視覺**：勾選完成時整行亮起極光青背景，全部完成時卡片外框泛起藍色微光。
- **霓虹啞鈴粒子雨慶祝 (NeonConfetti) 🎉**：當天所有動作的所有組數全部勾選完畢時，Canvas 引擎噴灑 80 顆霓虹發光啞鈴粒子雨，含物理重力模擬、空氣阻力、旋轉與漸進淡出。
- **毛玻璃動作挑選抽屜 (Exercise Picker Bottom Sheet)**：
    - 底部大 `＋` 按鈕一鍵喚起就地毛玻璃抽屜。
    - 內建搜尋輸入框、肌群分類篩選按鈕 (全部/胸/背/腿/肩/臂)。
    - 即時綠色 ✓ 閃爍回饋動畫、已加入狀態判斷、Escape 鍵關閉、Body 滾動鎖定等 PWA 級體驗細節。
- **超負荷突破偵測與同步 (Overload Breakthrough Detection)**：
    - 演算法即時比對今日已完成組數的最大負荷 vs 百科中的常用適應負荷。
    - 當偵測到突破 (重量超越或次數超越) 時，顯示一鍵收割按鈕，寫入本地資料庫並通知百科頁面同步刷新。
- **歷史補記模式**：切換至非今日的日期時，顯示金色毛玻璃警示條 (backdating notice)，標示正在補記的歷史日期，並提供「回到今天」快速按鈕。

### 5. 常用器材動作庫 (LibraryPage) ✅ 已實現

- **常用清單一鍵快加 (Quick-Add)**：每個動作右側有發光青色 `+` 按鈕，點擊自動加入今日日誌並導航至日誌頁面。
- **常用可承受負荷編輯面板**：每個動作有「編輯」按鈕，就地展開毛玻璃步進器面板 (重量/次數)，儲存後即時同步更新。動作卡片上顯示當前常用負荷 (如 `⚖ 60 kg × 10 下`)。
- **分類篩選 (Category Filter)**：全部/胸/背/腿/肩/臂 按鈕群，行動端橫向滾動、PC 端垂直面板。
- **預設動作庫**：包含槓鈴平躺臥推、啞鈴上斜臥推、滑輪下拉、槓鈴俯身划船、槓鈴深蹲、羅馬尼亞硬舉、啞鈴側平舉、啞鈴雙臂彎舉等 8 種常見動作。
- **自訂新動作 (Add Custom Exercise)**：支援在動作庫新增自訂動作 (名稱 + 肌群)，永久保存於本地資料庫。
- **PC 端雙欄自適應格線佈局**：寬螢幕下動作庫自動切換為 `auto-fill, minmax(360px, 1fr)` 格線排版。

### 6. 歷史紀錄模組 (HistoryPage) ✅ 已實現

- **霓虹發光日曆 (Neon Calendar Grid)**：42 格完整月曆，帶有訓練紀錄的日期亮起呼吸極光青圓點 (O(1) Set 查詢效能)。
- **歷史明細面板**：選定日期後，右側即時呈現三大負荷統計指標 (訓練量/組數/時長) 與動作組數清單。
- **一鍵複製為今日課表範本 (Template Copy)**：將歷史日期的訓練安排深拷貝至今日，重置所有完成狀態。
- **補記歷史日誌入口**：空紀錄的日期提供「補記這天的重量日誌」按鈕，智慧分流導航 (有紀錄→日誌頁, 無紀錄→百科頁)。
- **KeepAlive + onActivated 即時同步**：切換分頁後自動重載最新 LocalStorage 資料。

### 7. 設定與備份模組 (SettingsPage) ✅ 已實現

- **Google Drive 雲端備份控制面板**：
    - **真實 OAuth 2.0 綁定**：在 `localhost` 網域下，一鍵拉起 Google 官方授權登入彈窗，取得真實 Access Token，向 Google Drive `appDataFolder` 讀寫 `forge_fit_backup.json`。
    - **沙盒模擬模式 (Sandbox)**：在外部網域無金鑰時自動降級為模擬 Token，備份暫存至 LocalStorage，完整體驗上傳/下載/同步流程。
    - **自訂 Google Client ID 金鑰面板**：使用者可貼上自己申請的 `.apps.googleusercontent.com` 金鑰，在任意網域解鎖 100% 真實雲端備份。附 3 步驟 OAuth 教學指南 (`<details>` 可摺疊面板)。
    - **上傳備份 / 從雲端下載還原**：帶有旋轉 Loading 動畫、同步時間戳記錄、隱私保護提示 (`ShieldCheck` 圖示)。
- **危險數據重置區 (Danger Zone)**：毛玻璃紅色警示 Modal，需輸入大寫 `RESET` 安全驗證字元方可執行徹底抹除。

---

## 四、 Monorepo 與 Feature-Sliced Design (FSD) 目錄結構

```text
forge-fit/
├── apps/
│   └── web/                          # Vue 3 + Vite + TypeScript PWA 主應用程式 (FSD 規範)
│       ├── src/
│       │   ├── app/                  # 1. 全局初始化 (App.vue、main.ts、style.css)
│       │   ├── pages/                # 2. 獨立分頁
│       │   │   ├── dashboard/        #    └─ DashboardPage (今日訓練看板 + Chart.js 圓餅圖)
│       │   │   ├── logger/           #    └─ LoggerPage (重訓時光日誌 + 日曆 + 計時器 + 抽屜)
│       │   │   ├── library/          #    └─ LibraryPage (常用器材動作庫 + 負荷編輯)
│       │   │   ├── history/          #    └─ HistoryPage (歷史紀錄 + 日曆 + 模板複製)
│       │   │   └── settings/         #    └─ SettingsPage (Google Drive 備份 + 危險重置)
│       │   ├── widgets/              # 3. 大型高複用區塊
│       │   │   ├── sidebar/          #    └─ SidebarWidget (桌上版固定側邊選單)
│       │   │   └── mobile-nav/       #    └─ MobileNavWidget (Moze 風 5 欄底部導覽列)
│       │   ├── shared/               # 4. 公共複用層
│       │   │   ├── ui/
│       │   │   │   └── stepper/      #    └─ TactileStepper.vue (長按連續增減觸控步進器)
│       │   │   └── lib/
│       │   │       ├── confetti.ts   #    └─ NeonConfetti (Canvas 霓虹啞鈴粒子雨引擎)
│       │   │       └── useMediaQuery.ts # └─ 響應式媒體查詢 Composable
│       │   └── vite-env.d.ts
│       ├── index.html
│       ├── vite.config.ts
│       └── public/                   # manifest.json、logo.svg、favicon.svg、icons.svg
├── packages/
│   ├── core/                         # 核心數據處理包 (跨平台共享)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── dbService.ts      # LocalStorage 型別安全讀寫服務 (8 大 API)
│   │   │   ├── drive/
│   │   │   │   ├── driveService.ts   # Google Drive API 真實上傳/下載/搜尋
│   │   │   │   └── index.ts          # Drive 模組導出
│   │   │   └── index.ts              # 統一導出核心服務
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── types/                        # 統一的 TypeScript 型別定義
│       ├── src/
│       │   └── index.ts              # MuscleGroup, SetRecord, ExerciseSession,
│       │                             #   WorkoutSession, ExerciseDef, WorkoutDatabase
│       ├── package.json
│       └── tsconfig.json
├── package.json                      # Monorepo 根目錄配置 (Turbo + ESLint + Prettier)
├── pnpm-workspace.yaml               # pnpm 工作區設定
├── turbo.json                        # Turborepo 構建管線與快取設定
├── tsconfig.base.json                # 共享 TypeScript 基礎配置
├── tsconfig.json                     # 根目錄 TypeScript 配置
├── eslint.config.js                  # ESLint 9.x 扁平配置 (含 Vue + Prettier 插件)
└── README.md                         # 本專案技術文件
```

---

## 五、 技術選型決策

| 類別 | 技術選擇 | 說明 |
|------|---------|------|
| 套件管理 | pnpm 8.x + Turborepo 1.x | Monorepo 工作區管理與構建管線 |
| 前端框架 | Vue 3 (Composition API) + Vite + TypeScript | SFC + `<script setup>` + 型別安全 |
| 架構規範 | Feature-Sliced Design (FSD) | 分頁/元件/共享三層嚴格單向依賴 |
| 資料庫 | LocalStorage (Date-Keyed JSON) | 離線優先、微秒級即時存檔 |
| 雲端備份 | Google Identity Services (GIS) + Google Drive API v3 | OAuth 2.0 + appDataFolder 隱密區 |
| 圖表引擎 | Chart.js (auto import) | 響應式 Doughnut 動態重繪 |
| 圖標系統 | Lucide Vue Next | 完整 Icon 元件化，Tree-shaking 友好 |
| 粒子引擎 | 自研 Canvas NeonConfetti | 霓虹啞鈴粒子雨，含物理重力模擬 |
| 程式碼品質 | ESLint 9 + Prettier + typescript-eslint | 統一風格、自動格式化 |

---

## 六、 開發路徑 (Roadmap)

1. **Step 1: 初始化 Monorepo 骨架與 FSD 目錄 ✅ 已完成**
    - 建立 `pnpm-workspace.yaml`、`turbo.json`、根目錄 `package.json`、`.gitignore`。
    - 初始化 `apps/web` (Vue 3 + TS + Vite) 並建立 FSD 結構，寫好分頁響應式路由。
    - 配置 ESLint 9 扁平配置 + Prettier + TypeScript-ESLint + Vue Plugin。
    - 實現 `useMediaQuery` Composable 達成 PC/Mobile 響應式自動切換。

2. **Step 2: 核心功能元件化與 Vue 3 組件開發 ✅ 已完成**
    - 實作 `<TactileStepper />` 觸控步進器共享元件 (支援長按 Pointer 連續增減)。
    - 實作 `<DashboardPage />` 三大統計指標卡 + Chart.js 動態肌群環形圖 + 科普 Tooltip Popover。
    - 實作 `<LoggerPage />` 完整重訓日誌 (日曆、計時器、組數管理、霓虹核取、抽屜挑選、超負荷偵測)。
    - 實作 `<LibraryPage />` 常用器材百科庫 (分類篩選、一鍵快加、常用負荷步進器編輯面板)。
    - 實作 `<HistoryPage />` 歷史紀錄日曆 (42 格完整月曆、明細面板、模板複製、補記入口)。
    - 實作 `NeonConfetti` Canvas 霓虹啞鈴粒子雨引擎 (含物理重力、空氣阻力、旋轉淡出)。
    - 實作 `<SidebarWidget />`、`<MobileNavWidget />` 響應式雙端導覽系統。

3. **Step 3: packages/core 資料庫持久化與業務抽離 ✅ 已完成**
    - 在 `packages/core` 中撰寫型別安全的 LocalStorage 讀寫服務 (`dbService.ts`)，含 8 大 API。
    - 在 `packages/types` 中建立完整的共享型別定義 (`WorkoutSession`, `ExerciseDef`, `WorkoutDatabase` 等)。
    - 實現日期鍵值存取、預設動作庫初始化、自訂動作新增、常用負荷更新等核心邏輯。
    - 透過 Vue 的深層監聽 (`deep watch`) 實現微秒級自動存檔。

4. **Step 4: Google Drive API 備份模組實作與設定分頁開發 ✅ 已完成**
    - 在 `packages/core/src/drive` 中撰寫 Google Drive API v3 的真實上傳/下載/搜尋服務 (`driveService.ts`)。
    - 實作 `<SettingsPage />` Google Drive 雲端備份控制面板 (真實 OAuth 綁定 + 沙盒模擬雙軌模式)。
    - 實作自訂 Google Client ID 金鑰設定面板 + 3 步驟 OAuth 教學指南。
    - 實作危險數據重置區 (Danger Zone) 安全驗證 Modal。

5. **Step 5: 超負荷突破紀錄偵測與同步 ✅ 已完成**
    - 實作即時超負荷突破偵測演算法 (比對最大重量/次數 vs 百科常用負荷)。
    - 實作一鍵收割突破紀錄並同步寫入本地資料庫的 `updateExerciseLoadRecord` API。
    - 透過事件連動通知百科頁面即時刷新常用負荷顯示。

6. **Step 6: 體驗優化與進階功能 🔜 待進行**
    - 百科頁面搜尋輸入框啟用真實搜尋邏輯 (目前為 `readonly` 展示狀態)。
    - 「探索」分頁功能開發 (底部導覽列第二個佔位按鈕)。
    - 歷史成長折線趨勢圖 (訓練量隨時間變化的長期追蹤視覺化)。
    - 動作極限 PR (Personal Record) 里程碑提示與歷史記錄。
    - Service Worker 快取策略精細化 (Cache-First 靜態資源 + Network Fallback)。
    - 自訂新動作的 Modal 視窗 UI 精緻化。
