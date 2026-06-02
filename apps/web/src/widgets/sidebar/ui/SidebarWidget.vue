<script setup lang="ts">
import { Dumbbell, LayoutDashboard, ClipboardList, BookOpen, Settings, User } from 'lucide-vue-next'

// 💡 使用 Vue 3.4+ 高雅的雙向綁定 defineModel
const currentTab = defineModel<string>('currentTab', { required: true })
</script>

<template>
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
</template>
