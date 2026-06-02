<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
// 💡 導入我們在 packages/core 中實作的型別安全本機資料庫服務
import { initDatabase, getWorkoutByDate, saveWorkout, getExercisesLibrary } from '@forge-fit/core'
// 💡 導入共享的 TypeScript 型別定義
import type { WorkoutSession, ExerciseDef } from '@forge-fit/types'

import { DashboardPage } from '../pages/dashboard'
import { LoggerPage } from '../pages/logger'
import { HistoryPage } from '../pages/history'
import { LibraryPage } from '../pages/library'
import { SettingsPage } from '../pages/settings'
import { Dumbbell, Menu, X, CalendarDays, LayoutDashboard, ClipboardList, BookOpen, Settings } from 'lucide-vue-next'
import { SidebarWidget } from '../widgets/sidebar'
import { MobileNavWidget } from '../widgets/mobile-nav'
import { useMediaQuery } from '../shared/lib/useMediaQuery'

// 💡 取得雙端 JS 監聽狀態，達成 100% 銷毀看不見的 DOM 節點
const isMobile = useMediaQuery('(max-width: 768px)')

// 💡 控制手機版「側邊漢堡抽屜 (Mobile Drawer)」的開啟狀態
const isMobileDrawerOpen = ref(false)

// 1. 初始化資料庫並讀取今日日期字串 "YYYY-MM-DD"
const getTodayDateString = () => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

const todayStr = ref('')
const currentDateStr = ref('')
// 今日重訓日誌的響應式狀態 (Ref)
const todaySession = ref<WorkoutSession>({ date: '', exercises: [], duration: 0 })
// 百科動作庫
const exercisesLibrary = ref<ExerciseDef[]>([])

// 初始化載入
const initAppDatabase = () => {
    // 初始化 LocalStorage 結構並讀取預設动作庫
    initDatabase()

    todayStr.value = getTodayDateString()

    // 載入今日的重訓紀錄日誌
    todaySession.value = getWorkoutByDate(todayStr.value)

    // 載入動作庫清單
    exercisesLibrary.value = getExercisesLibrary()

    // 格式化今日的標題日期字串 (例如 "2026年6月1日 星期一")
    const now = new Date()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentDateStr.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
}

onMounted(() => {
    initAppDatabase()
})

// 2. ⚡ 神級響應式設計：深層監聽 (Deep Watch) 今日日誌狀態
// 當日誌中任何「重量、次數、完成狀態或新增組數」發生變更時，自動微秒級存檔到 LocalStorage！
watch(
    todaySession,
    newSession => {
        if (todayStr.value) {
            saveWorkout(todayStr.value, newSession)
        }
    },
    { deep: true }
)

// 3. 一鍵快加動作的處理邏輯 (供百科頁面調用)
const handleAddExercise = (exercise: ExerciseDef) => {
    // 檢查今日日誌中是否已存在此動作
    const exists = todaySession.value.exercises.some(ex => ex.exerciseId === exercise.id)

    if (!exists) {
        // 若不存在，新增一個空動作區塊並預設附帶 1 組
        todaySession.value.exercises.push({
            exerciseId: exercise.id,
            name: exercise.name,
            muscle: exercise.muscle,
            sets: [{ weight: 40, reps: 10, completed: false }]
        })
    }

    // 自動導航跳轉至重量紀錄分頁
    currentTab.value = 'logger'
}

// 4. 行動版頁面切換控制
const currentTab = ref('dashboard')

// 動態解析當前掛載的分頁組件
const activePage = computed(() => {
    switch (currentTab.value) {
        case 'dashboard':
            return DashboardPage
        case 'logger':
            return LoggerPage
        case 'history':
            return HistoryPage
        case 'library':
            return LibraryPage
        case 'settings':
            return SettingsPage
        default:
            return DashboardPage
    }
})

// 依據分頁動態產生標題
const pageTitle = computed(() => {
    switch (currentTab.value) {
        case 'dashboard':
            return '今日訓練看板'
        case 'logger':
            return '今日重量日誌'
        case 'history':
            return '重訓歷史紀錄'
        case 'library':
            return '常用器材動作庫'
        case 'settings':
            return '系統設定與備份'
        default:
            return '今日訓練看板'
    }
})
</script>

<template>
    <div class="app-container">
        <!-- 🖥️ 桌上版側邊選單 (A+B 方案：只在非行動端下渲染，徹底銷毀 DOM 冗餘) -->
        <SidebarWidget v-if="!isMobile" v-model:currentTab="currentTab" />

        <!-- 📱 行動版主工作區 -->
        <main class="app-main">
            <header class="app-header">
                <div class="header-title-section" style="align-items: center; display: flex; width: 100%;">
                    <!-- 💡 行動端頂部左側漢堡按鈕：點擊拉出側邊抽屜，實現 footer 專注今日、歷史放側邊 -->
                    <button 
                        v-if="isMobile" 
                        @click="isMobileDrawerOpen = true" 
                        class="btn-hamburger" 
                        title="開啟側邊選單"
                    >
                        <Menu :size="22" class="text-cyan" />
                    </button>

                    <div class="mobile-brand" v-if="!isMobile">
                        <Dumbbell class="text-cyan" :size="20" />
                        <span>FORGE<span>FIT</span></span>
                    </div>
                    
                    <div class="header-text-group" style="flex: 1;">
                        <h1 class="header-title">{{ pageTitle }}</h1>
                        <p class="header-subtitle">{{ currentDateStr }}</p>
                    </div>
                </div>
            </header>

            <!-- 💡 將今日日誌 session 與動作庫、添加方法以 Props 注入當前分頁 -->
            <KeepAlive>
                <component
                    :is="activePage"
                    :session="todaySession"
                    :exercises-library="exercisesLibrary"
                    @add-exercise="handleAddExercise"
                    @switch-tab="currentTab = $event"
                />
            </KeepAlive>
        </main>

        <!-- 📱 PWA 行動版底部導覽列 (A+B 方案：只在行動端下渲染，徹底銷毀 DOM 冗餘) -->
        <MobileNavWidget v-if="isMobile" v-model:currentTab="currentTab" />
    </div>

    <!-- 💡 手機版毛玻璃科技風「側邊抽屜導航」 (與行動端側邊欄邏輯完美雙修) -->
    <Teleport to="body">
        <Transition name="fade">
            <div 
                v-if="isMobile && isMobileDrawerOpen" 
                @click="isMobileDrawerOpen = false" 
                class="mobile-drawer-overlay"
            ></div>
        </Transition>
        
        <Transition name="slide-left">
            <aside 
                v-if="isMobile && isMobileDrawerOpen" 
                class="mobile-drawer-aside"
            >
                <!-- 抽屜頭部 -->
                <div class="drawer-header">
                    <div class="drawer-brand">
                        <Dumbbell class="text-cyan" :size="20" />
                        <span>FORGE<span>FIT</span></span>
                    </div>
                    <button @click="isMobileDrawerOpen = false" class="btn-close-drawer">
                        <X :size="20" />
                    </button>
                </div>
                
                <!-- 抽屜選單連結 (與桌上版側邊選單完美對應) -->
                <nav class="drawer-menu">
                    <button 
                        @click="currentTab = 'dashboard'; isMobileDrawerOpen = false"
                        class="drawer-item" 
                        :class="{ active: currentTab === 'dashboard' }"
                    >
                        <LayoutDashboard :size="18" />
                        <span>今日訓練看板</span>
                    </button>
                    <button 
                        @click="currentTab = 'logger'; isMobileDrawerOpen = false"
                        class="drawer-item" 
                        :class="{ active: currentTab === 'logger' }"
                    >
                        <ClipboardList :size="18" />
                        <span>今日重量日誌</span>
                    </button>
                    <button 
                        @click="currentTab = 'history'; isMobileDrawerOpen = false"
                        class="drawer-item" 
                        :class="{ active: currentTab === 'history' }"
                    >
                        <CalendarDays :size="18" />
                        <span>重訓歷史紀錄</span>
                    </button>
                    <button 
                        @click="currentTab = 'library'; isMobileDrawerOpen = false"
                        class="drawer-item" 
                        :class="{ active: currentTab === 'library' }"
                    >
                        <BookOpen :size="18" />
                        <span>常用器材百科</span>
                    </button>
                    <button 
                        @click="currentTab = 'settings'; isMobileDrawerOpen = false"
                        class="drawer-item" 
                        :class="{ active: currentTab === 'settings' }"
                    >
                        <Settings :size="18" />
                        <span>系統設定備份</span>
                    </button>
                </nav>
                
                <!-- 抽屜底部用戶欄 -->
                <div class="drawer-footer">
                    <div class="drawer-user-info">
                        <div class="user-name">悍將健身者</div>
                        <div class="user-rank">Lv.5 鋼鐵核心</div>
                    </div>
                </div>
            </aside>
        </Transition>
    </Teleport>
</template>

<style>
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 💡 行動端頂部漢堡按鈕樣式 */
.btn-hamburger {
    background: transparent;
    border: none;
    padding: 8px;
    margin-right: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.btn-hamburger:active {
    transform: scale(0.9);
}

/* 💡 手機版側邊抽屜遮罩 */
.mobile-drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(8, 10, 16, 0.75);
    backdrop-filter: blur(5px);
    z-index: 9999;
}

/* 💡 手機版側邊抽屜主體 - 毛玻璃霓虹科技風 */
.mobile-drawer-aside {
    position: fixed;
    top: 0;
    left: 0;
    width: 270px;
    height: 100vh;
    background: linear-gradient(180deg, rgba(18, 22, 36, 0.96) 0%, rgba(8, 10, 16, 0.98) 100%);
    backdrop-filter: blur(25px);
    border-right: 1px solid rgba(0, 240, 255, 0.15);
    box-shadow: 5px 0 25px rgba(0, 240, 255, 0.15);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
}

.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 1rem;
}

.drawer-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Outfit', 'Inter', sans-serif;
    font-weight: 900;
    font-size: 1.1rem;
    letter-spacing: 0.05em;
    color: #FFF;
}

.drawer-brand span span {
    color: var(--color-cyan);
    text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
}

.btn-close-drawer {
    background: transparent;
    border: none;
    color: var(--text-sub);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.drawer-menu {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
}

.drawer-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    color: var(--text-sub);
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Inter', sans-serif;
}

.drawer-item:hover {
    background: rgba(255, 255, 255, 0.03);
    color: #FFF;
}

.drawer-item.active {
    background: rgba(0, 240, 255, 0.06);
    border-color: rgba(0, 240, 255, 0.2);
    color: var(--color-cyan);
    text-shadow: 0 0 6px rgba(0, 240, 255, 0.3);
    box-shadow: inset 0 0 10px rgba(0, 240, 255, 0.02);
}

.drawer-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 1rem;
    margin-top: auto;
}

.drawer-user-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

/* 💡 滑出與淡入動畫 */
.fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}

.slide-left-enter-active, .slide-left-leave-active {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-enter-from, .slide-left-leave-to {
    transform: translateX(-100%);
}
</style>
