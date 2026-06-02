<script setup lang="ts">
import { LayoutDashboard, ClipboardList, BookOpen, Settings } from 'lucide-vue-next'

// 💡 使用 Vue 3.4+ 高雅的雙向綁定 defineModel
const currentTab = defineModel<string>('currentTab', { required: true })
</script>

<template>
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
</template>
