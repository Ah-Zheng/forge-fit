<script setup lang="ts">
import { Dumbbell, LayoutDashboard, ClipboardList, BookOpen, Settings, User } from '@lucide/vue'
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
            <RouterLink
                to="/dashboard"
                class="menu-item"
                active-class="active"
            >
                <LayoutDashboard :size="20" />
                <span>訓練看板</span>
            </RouterLink>
            <RouterLink
                to="/logger"
                class="menu-item"
                active-class="active"
            >
                <ClipboardList :size="20" />
                <span>重量紀錄</span>
            </RouterLink>
            <RouterLink
                to="/library"
                class="menu-item"
                active-class="active"
            >
                <BookOpen :size="20" />
                <span>器材百科</span>
            </RouterLink>
            <RouterLink
                to="/settings"
                class="menu-item"
                active-class="active"
            >
                <Settings :size="20" />
                <span>設定與備份</span>
            </RouterLink>
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
