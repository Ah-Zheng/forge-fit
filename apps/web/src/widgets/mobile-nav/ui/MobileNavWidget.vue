<script setup lang="ts">
import { LayoutDashboard, ClipboardList, BookOpen, Settings, Plus, Compass } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useWorkoutStore } from '../../../entities/workout'

const route = useRoute()
const router = useRouter()
const store = useWorkoutStore()

const handleCenterClick = () => {
    if (route.path === '/logger') {
        // 當前就在日誌頁面時，點選中心按鈕觸作「就地新增訓練項目」
        store.isLoggerDrawerOpen = true
    } else {
        // 在其他頁面時，點選中心按鈕直接導向切換至日誌頁面
        router.push('/logger')
    }
}
</script>

<template>
    <nav class="mobile-nav-bar">
        <!-- 1. 今日看板 (最左邊) -->
        <RouterLink
            to="/dashboard"
            class="mobile-nav-item"
            active-class="active"
        >
            <LayoutDashboard :size="18" />
            <span>看板</span>
        </RouterLink>
        
        <!-- 2. 💡 暫時佔位按鈕 (左邊數來第二個，無實際功能，以半透明度與指針指南針呈現極佳期待感) -->
        <button
            class="mobile-nav-item"
            style="opacity: 0.55; cursor: default;"
            title="功能即將開放，敬請期待"
            @click.prevent
        >
            <Compass :size="18" />
            <span>探索</span>
        </button>
        
        <!-- 3. 💡 Moze 記帳風：正中間凸出、霓虹呼吸發光的動態雙態大按鈕 (日誌 / +) -->
        <div class="mobile-nav-center-btn-wrapper">
            <button
                class="mobile-nav-center-btn"
                @click="handleCenterClick"
                :title="route.path === '/logger' ? '就地新增重訓動作' : '快速切換至重量日誌'"
            >
                <Plus v-if="route.path === '/logger'" :size="24" />
                <ClipboardList v-else :size="20" />
            </button>
        </div>
        
        <!-- 4. 器材百科 (右邊數來第二個) -->
        <RouterLink
            to="/library"
            class="mobile-nav-item"
            active-class="active"
        >
            <BookOpen :size="18" />
            <span>百科</span>
        </RouterLink>
        
        <!-- 5. 系統設定 (最右邊) -->
        <RouterLink
            to="/settings"
            class="mobile-nav-item"
            active-class="active"
        >
            <Settings :size="18" />
            <span>設定</span>
        </RouterLink>
    </nav>
</template>
