import { createRouter, createWebHashHistory } from 'vue-router'
import { DashboardPage } from '../pages/dashboard'
import { LoggerPage } from '../pages/logger'
import { PlanPage } from '../pages/plan'
import { LibraryPage } from '../pages/library'
import { SettingsPage } from '../pages/settings'

const routes = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: DashboardPage,
        meta: { title: '今日訓練看板' }
    },
    {
        path: '/logger',
        name: 'logger',
        component: LoggerPage,
        meta: { title: '重訓時光日誌' }
    },
    {
        path: '/plan',
        name: 'plan',
        component: PlanPage,
        meta: { title: '今日訓練計劃與休息' }
    },
    {
        path: '/library',
        name: 'library',
        component: LibraryPage,
        meta: { title: '常用器材動作庫' }
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsPage,
        meta: { title: '系統設定與備份' }
    }
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes
})
