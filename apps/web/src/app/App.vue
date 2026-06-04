<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
// 💡 導入我們手寫的 Pinia Workout Store
import { useWorkoutStore, useRestTimerStore } from '../entities/workout'
import { Dumbbell, Menu, X, LayoutDashboard, ClipboardList, BookOpen, Settings, Pause, Timer, Play } from '@lucide/vue'
import { SidebarWidget } from '../widgets/sidebar'
import { MobileNavWidget } from '../widgets/mobile-nav'
import { useMediaQuery } from '../shared/lib/useMediaQuery'
import CustomDialog from '../shared/ui/dialog/CustomDialog.vue'

// 💡 取得雙端 JS 監聽狀態，達成 100% 銷毀看不見 the DOM 節點
const isMobile = useMediaQuery('(max-width: 768px)')

// 💡 控制手機版「側邊漢堡抽屜 (Mobile Drawer)」的開啟狀態
const isMobileDrawerOpen = ref(false)

// 💡 引入 Pinia 全局狀態
const store = useWorkoutStore()
const timerStore = useRestTimerStore()

const route = useRoute()
const currentDateStr = ref('')

onMounted(() => {
    // 💡 初始化資料庫載入與狀態讀取
    store.initStore()
    timerStore.restoreTimerState()
    timerStore.loadGlobalRestDuration()

    // 格式化今日的標題日期字串 (例如 "2026年6月1日 星期一")
    const now = new Date()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentDateStr.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
})

// 依據當前路由的 meta title 動態產生標題
const pageTitle = computed(() => {
    return (route.meta?.title as string) || '今日訓練看板'
})

// 💡 全局懸浮跑秒格式化
const formattedDuration = computed(() => {
    const totalSeconds = store.globalLiveSeconds
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// 💡 全局懸浮休息倒數格式化
const formattedRestTime = computed(() => {
    const totalSeconds = timerStore.timeLeft
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00'
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// 💡 判斷是否顯示全局懸浮計時條 (總計時或休息計時在跑，且不在 Dashboard 或 Plan 頁面)
const showFloatingTimer = computed(() => {
    const isPlanOrDashboard = route.path === '/' || route.path === '/dashboard' || route.path === '/plan'
    return (store.globalIsTimerActive || timerStore.isResting) && !isPlanOrDashboard
})
</script>

<template>
    <div class="app-container">
        <!-- 🖥️ 桌上版側邊選單 (A+B 方案：只在非行動端下渲染，徹底銷毀 DOM 冗餘) -->
        <SidebarWidget v-if="!isMobile" />

        <!-- 📱 行動版主工作區 -->
        <main class="app-main">
            <header class="app-header">
                <div class="header-title-section">
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
                    
                    <div class="header-text-group">
                        <h1 class="header-title">{{ pageTitle }}</h1>
                        <p class="header-subtitle">{{ currentDateStr }}</p>
                    </div>
                </div>
            </header>

            <!-- 💡 使用 vue-router 渲染頁面，並搭配 KeepAlive 維持頁面快取 -->
            <router-view v-slot="{ Component }">
                <keep-alive>
                    <component :is="Component" />
                </keep-alive>
            </router-view>
        </main>

        <!-- 📱 PWA 行動版底部導覽列 (A+B 方案：只在行動端下渲染，徹底銷毀 DOM 冗餘) -->
        <MobileNavWidget v-if="isMobile" />
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
                    <RouterLink 
                        to="/dashboard"
                        @click="isMobileDrawerOpen = false"
                        class="drawer-item" 
                        active-class="active"
                    >
                        <LayoutDashboard :size="18" />
                        <span>今日訓練看板</span>
                    </RouterLink>
                    <RouterLink 
                        to="/logger"
                        @click="isMobileDrawerOpen = false"
                        class="drawer-item" 
                        active-class="active"
                    >
                        <ClipboardList :size="18" />
                        <span>今日重量日誌</span>
                    </RouterLink>
                    <RouterLink 
                        to="/plan"
                        @click="isMobileDrawerOpen = false"
                        class="drawer-item" 
                        active-class="active"
                    >
                        <Timer :size="18" />
                        <span>訓練計劃</span>
                    </RouterLink>

                    <RouterLink 
                        to="/library"
                        @click="isMobileDrawerOpen = false"
                        class="drawer-item" 
                        active-class="active"
                    >
                        <BookOpen :size="18" />
                        <span>常用器材百科</span>
                    </RouterLink>
                    <RouterLink 
                        to="/settings"
                        @click="isMobileDrawerOpen = false"
                        class="drawer-item" 
                        active-class="active"
                    >
                        <Settings :size="18" />
                        <span>系統設定備份</span>
                    </RouterLink>
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

    <!-- ✨ 全站懸浮計時條 (Global Floating Timer Bar) -->
    <Transition name="slide-up-timer">
        <div 
            v-if="showFloatingTimer" 
            class="global-floating-timer glass-card"
            :class="{ 
                'is-mobile-timer': isMobile,
                'has-active-rest': timerStore.isResting 
            }"
        >
            <!-- 區塊一：訓練總時長 -->
            <RouterLink v-if="store.globalIsTimerActive" to="/logger" class="timer-link-area">
                <div class="pulse-icon-box">
                    <Timer :size="13" class="text-cyan glow-cyan timer-icon" />
                </div>
                <span class="timer-time">{{ formattedDuration }}</span>
            </RouterLink>

            <!-- 分隔線 (如果兩者都存在) -->
            <div v-if="store.globalIsTimerActive && timerStore.isResting" class="timer-divider"></div>

            <!-- 區塊二：組間休息倒數 (雙軌並排動態島) -->
            <RouterLink v-if="timerStore.isResting" to="/plan" class="timer-link-area rest-link-area">
                <div class="pulse-icon-box-orange" :class="{ 'paused-pulse': timerStore.isPaused }">
                    <Timer :size="13" class="text-orange glow-orange timer-icon" />
                </div>
                <span class="timer-time text-orange">{{ formattedRestTime }}</span>
            </RouterLink>

            <!-- 懸浮條右側控制按鈕 -->
            <div class="floating-controls">
                <!-- 暫停/繼續 休息 (如果正在休息) -->
                <button 
                    v-if="timerStore.isResting && !timerStore.isPaused"
                    class="btn-floating-pause text-orange-hover" 
                    @click.stop="timerStore.pauseRest"
                    title="暫停休息"
                >
                    <Pause :size="10" />
                </button>
                <button 
                    v-else-if="timerStore.isResting && timerStore.isPaused"
                    class="btn-floating-pause text-green-hover" 
                    @click.stop="timerStore.resumeRest"
                    title="繼續休息"
                >
                    <Play :size="10" />
                </button>
                
                <!-- 暫停/繼續 訓練 (如果沒有在休息，只顯示原本的暫停按鈕) -->
                <button 
                    v-else-if="store.globalIsTimerActive"
                    class="btn-floating-pause" 
                    @click.stop="store.pauseGlobalTimer"
                    title="暫停訓練計時"
                >
                    <Pause :size="10" />
                </button>
            </div>
        </div>
    </Transition>

    <!-- 💡 全站客製化對話框 (Alert/Confirm) -->
    <CustomDialog />
</template>

<style lang="scss">
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

.header-title-section {
    align-items: center;
    display: flex;
    width: 100%;
}

.header-text-group {
    flex: 1;
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

/* ✨ 全站懸浮計時條樣式 (A+B 方案) */
/* ✨ 全站懸浮計時條樣式 (A+B 方案) */
.global-floating-timer {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 36px;
    background: rgba(18, 22, 36, 0.82) !important;
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(0, 240, 255, 0.25) !important;
    border-radius: 18px;
    padding: 0 0.65rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 6px 24px 0 rgba(0, 240, 255, 0.12), inset 0 0 8px rgba(0, 240, 255, 0.05);
    z-index: 9998;
    transition: all 0.3s ease;

    /* 行動端：置於底部選單上方的正中間，避免阻擋可視範圍 */
    &.is-mobile-timer {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        bottom: 75px; /* 置於 MobileNavWidget (大約 65px) 上方 */
        width: 160px;
    }

    /* 💡 動態島：當啟動組間休息時計時條自動平滑變寬，呈橘色霓虹發光 */
    &.has-active-rest {
        width: 270px;
        border-color: rgba(255, 122, 0, 0.35) !important;
        box-shadow: 0 6px 24px 0 rgba(255, 122, 0, 0.15), inset 0 0 8px rgba(255, 122, 0, 0.05);

        &.is-mobile-timer {
            width: 270px;
        }
    }

    .timer-divider {
        width: 1px;
        height: 16px;
        background: rgba(255, 255, 255, 0.12);
        margin: 0 0.5rem;
    }

    .floating-controls {
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }

    .text-orange {
        color: #ff7a00 !important;
        text-shadow: 0 0 6px rgba(255, 122, 0, 0.3) !important;
    }

    .text-orange-hover {
        background: rgba(255, 122, 0, 0.08) !important;
        border-color: rgba(255, 122, 0, 0.2) !important;
        color: #ff7a00 !important;
        
        &:hover {
            background: #ff7a00 !important;
            color: #fff !important;
            box-shadow: 0 0 6px rgba(255, 122, 0, 0.4) !important;
        }
    }

    .text-green-hover {
        background: rgba(0, 230, 120, 0.08) !important;
        border-color: rgba(0, 230, 120, 0.2) !important;
        color: var(--color-success) !important;
        
        &:hover {
            background: var(--color-success) !important;
            color: #fff !important;
            box-shadow: 0 0 6px rgba(0, 230, 120, 0.4) !important;
        }
    }

    .timer-link-area {
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        flex: 1;
        min-width: 0;
    }

    .pulse-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        animation: timerPulse 2s infinite ease-in-out;

        .timer-icon {
            filter: drop-shadow(0 0 3px var(--color-cyan));
        }
    }

    .pulse-icon-box-orange {
        display: flex;
        align-items: center;
        justify-content: center;
        animation: timerPulseOrange 2s infinite ease-in-out;

        &.paused-pulse {
            animation-play-state: paused;
        }

        .timer-icon {
            filter: drop-shadow(0 0 3px #ff7a00);
        }
    }

    .timer-time {
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--color-cyan);
        font-family: 'Outfit', 'Inter', monospace;
        text-shadow: 0 0 6px rgba(0, 240, 255, 0.3);
        line-height: 1;
    }

    .btn-floating-pause {
        background: rgba(255, 74, 74, 0.08);
        border: 1px solid rgba(255, 74, 74, 0.2);
        color: var(--color-danger);
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;

        &:hover {
            background: var(--color-danger) !important;
            color: #fff !important;
            box-shadow: 0 0 6px rgba(255, 74, 74, 0.4);
            transform: scale(1.05);
        }

        &:active {
            transform: scale(0.95);
        }
    }
}

@keyframes timerPulse {
    0% {
        transform: scale(1);
        filter: drop-shadow(0 0 2px rgba(0, 240, 255, 0.2));
    }
    50% {
        transform: scale(1.12);
        filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.6));
    }
    100% {
        transform: scale(1);
        filter: drop-shadow(0 0 2px rgba(0, 240, 255, 0.2));
    }
}

@keyframes timerPulseOrange {
    0% {
        transform: scale(1);
        filter: drop-shadow(0 0 2px rgba(255, 122, 0, 0.2));
    }
    50% {
        transform: scale(1.12);
        filter: drop-shadow(0 0 6px rgba(255, 122, 0, 0.6));
    }
    100% {
        transform: scale(1);
        filter: drop-shadow(0 0 2px rgba(255, 122, 0, 0.2));
    }
}

/* 懸浮條滑入滑出動畫 */
.slide-up-timer-enter-active,
.slide-up-timer-leave-active {
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
}
.slide-up-timer-enter-from,
.slide-up-timer-leave-to {
    transform: translateX(-50%) translateY(120%) scale(0.95);
    opacity: 0;
}
</style>
