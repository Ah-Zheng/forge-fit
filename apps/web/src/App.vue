<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
// 💡 導入我們在 packages/core 中實作的型別安全本機資料庫服務
import { 
  initDatabase, 
  getWorkoutByDate, 
  saveWorkout, 
  getExercisesLibrary 
} from '@forge-fit/core'
// 💡 導入共享的 TypeScript 型別定義
import type { WorkoutSession, ExerciseDef } from '@forge-fit/types'

import { DashboardPage } from './pages/dashboard'
import { LoggerPage } from './pages/logger'
import { LibraryPage } from './pages/library'
import { SettingsPage } from './pages/settings'
import { 
  Dumbbell, 
  LayoutDashboard, 
  ClipboardList, 
  BookOpen, 
  Settings, 
  User 
} from 'lucide-vue-next'

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
watch(todaySession, (newSession) => {
  if (todayStr.value) {
    saveWorkout(todayStr.value, newSession)
  }
}, { deep: true })

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
      sets: [
        { weight: 40, reps: 10, completed: true }
      ]
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
    case 'dashboard': return DashboardPage
    case 'logger': return LoggerPage
    case 'library': return LibraryPage
    case 'settings': return SettingsPage
    default: return DashboardPage
  }
})

// 依據分頁動態產生標題
const pageTitle = computed(() => {
  switch (currentTab.value) {
    case 'dashboard': return '今日訓練看板'
    case 'logger': return '今日重量日誌'
    case 'library': return '常用器材動作庫'
    case 'settings': return '系統設定與備份'
    default: return '今日訓練看板'
  }
})
</script>

<template>
  <div class="app-container">
    <!-- 🖥️ 桌上版側邊選單 (手機版自動隱藏) -->
    <aside class="app-sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <Dumbbell class="neon-glow-icon" :size="24" />
        </div>
        <span class="brand-text">FORGE<span>FIT</span></span>
      </div>
      
      <nav class="sidebar-menu">
        <button 
          @click="currentTab = 'dashboard'" 
          class="menu-item" 
          :class="{ active: currentTab === 'dashboard' }"
        >
          <LayoutDashboard :size="20" />
          <span>訓練看板</span>
        </button>
        <button 
          @click="currentTab = 'logger'" 
          class="menu-item" 
          :class="{ active: currentTab === 'logger' }"
        >
          <ClipboardList :size="20" />
          <span>重量紀錄</span>
        </button>
        <button 
          @click="currentTab = 'library'" 
          class="menu-item" 
          :class="{ active: currentTab === 'library' }"
        >
          <BookOpen :size="20" />
          <span>器材百科</span>
        </button>
        <button 
          @click="currentTab = 'settings'" 
          class="menu-item" 
          :class="{ active: currentTab === 'settings' }"
        >
          <Settings :size="20" />
          <span>設定與備份</span>
        </button>
      </nav>
      
      <div class="sidebar-user">
        <div class="user-avatar">
          <User :size="18" />
        </div>
        <div class="user-info">
          <div class="user-name">悍將健身者</div>
          <div class="user-rank">Lv.5 鋼鐵核心</div>
        </div>
      </div>
    </aside>

    <!-- 📱 行動版主工作區 -->
    <main class="app-main">
      <header class="app-header">
        <div class="header-title-section">
          <div class="mobile-brand">
            <Dumbbell class="text-cyan" :size="20" />
            <span>FORGE<span>FIT</span></span>
          </div>
          <h1 class="header-title">{{ pageTitle }}</h1>
          <p class="header-subtitle">{{ currentDateStr }}</p>
        </div>
      </header>

      <!-- 💡 將今日日誌 session 與動作庫、添加方法以 Props 注入當前分頁 -->
      <component 
        :is="activePage" 
        :session="todaySession"
        :exercises-library="exercisesLibrary"
        @add-exercise="handleAddExercise"
      />
    </main>

    <!-- 📱 PWA 行動版底部導覽列 -->
    <nav class="mobile-nav-bar">
      <button 
        class="mobile-nav-item" 
        :class="{ active: currentTab === 'dashboard' }"
        @click="currentTab = 'dashboard'"
      >
        <LayoutDashboard :size="20" />
        <span>看板</span>
      </button>
      <button 
        class="mobile-nav-item" 
        :class="{ active: currentTab === 'logger' }"
        @click="currentTab = 'logger'"
      >
        <ClipboardList :size="20" />
        <span>重量紀錄</span>
      </button>
      <button 
        class="mobile-nav-item" 
        :class="{ active: currentTab === 'library' }"
        @click="currentTab = 'library'"
      >
        <BookOpen :size="20" />
        <span>百科</span>
      </button>
      <button 
        class="mobile-nav-item" 
        :class="{ active: currentTab === 'settings' }"
        @click="currentTab = 'settings'"
      >
        <Settings :size="20" />
        <span>設定</span>
      </button>
    </nav>
  </div>
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
</style>
