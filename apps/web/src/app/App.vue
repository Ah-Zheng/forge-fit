<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
// 💡 導入我們手寫的 Pinia Workout Store
import { useWorkoutStore } from '../entities/workout'
import { Dumbbell, Menu, X, LayoutDashboard, ClipboardList, BookOpen, Settings } from '@lucide/vue'
import { SidebarWidget } from '../widgets/sidebar'
import { MobileNavWidget } from '../widgets/mobile-nav'
import { useMediaQuery } from '../shared/lib/useMediaQuery'

// 💡 取得雙端 JS 監聽狀態，達成 100% 銷毀看不見 the DOM 節點
const isMobile = useMediaQuery('(max-width: 768px)')

// 💡 控制手機版「側邊漢堡抽屜 (Mobile Drawer)」的開啟狀態
const isMobileDrawerOpen = ref(false)

// 💡 引入 Pinia 全局狀態
const store = useWorkoutStore()

const route = useRoute()
const currentDateStr = ref('')

onMounted(() => {
    // 💡 初始化資料庫載入與狀態讀取
    store.initStore()

    // 格式化今日的標題日期字串 (例如 "2026年6月1日 星期一")
    const now = new Date()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentDateStr.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
})

// 依據當前路由的 meta title 動態產生標題
const pageTitle = computed(() => {
    return (route.meta?.title as string) || '今日訓練看板'
})
</script>

<template>
    <div class="app-container">
        <!-- 🖥️ 桌上版側邊選單 (A+B 方案：只在非行動端下渲染，徹底銷毀 DOM 冗餘) -->
        <SidebarWidget v-if="!isMobile" />

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
