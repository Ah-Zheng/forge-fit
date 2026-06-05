<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkoutStore, useRestTimerStore } from '../../../entities/workout'
import { useDialogStore } from '../../../shared/ui/dialog/dialogStore'
import {
    Cloud,
    CloudLightning,
    RefreshCw,
    UserCheck,
    LogOut,
    AlertTriangle,
    ShieldCheck,
    Timer,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus
} from '@lucide/vue'
/** 💡 導入我們手寫的高性能 Canvas 霓虹粒子引擎 */
import { NeonConfetti } from '../../../shared/lib/confetti'

// 💡 引入 Pinia 全局狀態
const store = useWorkoutStore()
const timerStore = useRestTimerStore()
const dialogStore = useDialogStore()

const {
    accessToken,
    isLinked,
    userEmail,
    lastSyncedTime,
    isSyncing,
    isRestoring,
    isMockMode
} = storeToRefs(store)

const { globalRestDuration } = storeToRefs(timerStore)

// 💡 安全的休息時長格式化，防禦 NaN
const formattedGlobalRestDuration = computed(() => {
    const duration = timerStore.globalRestDuration
    if (isNaN(duration) || duration <= 0) {
        return { mins: 1, secs: 30, total: 90 }
    }
    return {
        mins: Math.floor(duration / 60),
        secs: duration % 60,
        total: duration
    }
})

// 💡 控制當前顯示的設定分頁 (menu=主選單, google=雲端備份, timer=休息計時設定)
const currentView = ref<'menu' | 'google' | 'timer'>('menu')

/** 💡 從 Vite 環境變數動態載入 Google Client ID，避免憑證硬編碼暴露在程式碼中，符合現代 Web 安全防禦工程實踐！ */
const DEFAULT_CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || ''

/** Google Identity Services (GIS) 憑證登入實例 */
let tokenClient: any = null

/** Canvas 霓虹發光啞鈴粒子發射器畫布 DOM 節點 */
const confettiCanvas = ref<HTMLCanvasElement | null>(null)

/** 高性能 Canvas 霓虹粒子引擎實例 */
let confettiEngine: NeonConfetti | null = null

/** 💡 畫布 active 狀態。使用 v-if 來保證平常狀態下 canvas 完全不在 DOM 中渲染，0% 機率阻擋點擊！ */
const isCanvasActive = ref(false)

const triggerCelebrate = async (count = 50) => {
    isCanvasActive.value = true
    await nextTick()
    if (confettiCanvas.value) {
        confettiEngine = new NeonConfetti(confettiCanvas.value)
        confettiEngine.burst(count)
    }
    setTimeout(() => {
        isCanvasActive.value = false
        if (confettiEngine) {
            confettiEngine.destroy()
            confettiEngine = null
        }
    }, 3000)
}

/** 💡 判斷是否為本機開發網域 (例如 localhost、127.0.0.1、區域網路 IP) */
const isLocalhost = computed(() => {
    if (typeof window === 'undefined') return true
    const host = window.location.hostname
    return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
})

/** 💡 判斷當前環境是否能夠直接進行真實 Google Drive OAuth 2.0 綁定 */
const canUseRealOAuth = computed(() => {
    return !!DEFAULT_CLIENT_ID || isLocalhost.value
})

/** 💡 依據連線與憑證狀態，動態決定的綁定按鈕呈現文字 */
const connectBtnText = computed(() => {
    if (canUseRealOAuth.value) {
        return '連結真實 Google 帳號 🟢'
    }
    return '開啟模擬沙盒同步'
})

onMounted(() => {
    // 💡 初始化 Store
    store.initStore()

    // 動態加載 Google GIS Client 官方腳本
    loadGoogleGisScript()
})

onUnmounted(() => {
    if (confettiEngine) {
        confettiEngine.destroy()
        confettiEngine = null
    }
})

/**
 * 動態載入 Google 官方 Identity Services OAuth 腳本
 */
const loadGoogleGisScript = () => {
    if (typeof window === 'undefined' || (window as any).google) {
        initGoogleOAuth()
        return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
        initGoogleOAuth()
    }
    document.head.appendChild(script)
}

/**
 * 初始化 Google GIS 憑證 Token 請求客戶端
 */
const initGoogleOAuth = () => {
    if (typeof window === 'undefined' || !(window as any).google) return

    const activeClientId = DEFAULT_CLIENT_ID

    // 💡 如果在非 localhost 的生產/自訂網域，且沒有 Client ID，則直接維持沙盒模式，防止拉起真實 GIS 時 Google 報錯
    if (!canUseRealOAuth.value) {
        tokenClient = null
        isMockMode.value = true
        return
    }

    try {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: activeClientId,
            scope: 'https://www.googleapis.com/auth/drive.appdata email profile openid',
            callback: async (response: any) => {
                if (response.error) {
                    console.error('Google OAuth 授權出錯:', response.error)
                    await dialogStore.alert(`Google 帳號連結失敗，請確認您的網路狀況！\n錯誤碼：${response.error}`, '連結失敗', { type: 'danger' })
                    return
                }

                let email = 'google_warrior@gmail.com'
                // 真實連結時，發起一次輕量 API 取得用戶真實信箱
                try {
                    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${response.access_token}` }
                    })
                    if (userRes.ok) {
                        const userData = await userRes.json()
                        email = userData.email || 'google_warrior@gmail.com'
                    }
                } catch (err) {
                    console.error('獲取 Google 用戶信箱失敗:', err)
                }

                // 💡 使用 store.setGoogleAuth 統一管理
                store.setGoogleAuth(response.access_token, email)

                triggerCelebrate(50)
                await dialogStore.alert('🟢 恭喜！真實 Google 帳號成功綁定！現已開啟 100% 真實雲端硬碟備份還原功能。', '連結成功', { type: 'success' })
            }
        })
    } catch (e) {
        console.warn('初始化真實 Google OAuth 失敗，轉為自動相容的測試沙盒模式。', e)
        tokenClient = null
        isMockMode.value = true
    }
}

/**
 * 點擊連結 Google 帳號，自動判斷是走真實 OAuth 授權還是模擬沙盒模式
 */
const handleConnectGoogle = () => {
    // 💡 確保在連線前再次嘗試初始化 token 實例，以對齊最新的金鑰狀態
    initGoogleOAuth()

    if (tokenClient && canUseRealOAuth.value) {
        // 💡 100% 真實綁定：拉起 Google 官方帳號授權登入彈窗
        try {
            tokenClient.requestAccessToken({ prompt: 'consent' })
        } catch (e) {
            console.error('拉起 Google OAuth 彈窗失敗，降級為沙盒：', e)
            startSandboxMode()
        }
    } else {
        // 💡 降級為模擬沙盒開發模式
        startSandboxMode()
    }
}

/**
 * 啟動沙盒模擬測試模式，自動配置模擬 Token 與測試信箱，無痛體驗流程
 */
const startSandboxMode = async () => {
    const mockToken = `mock-token-${Date.now()}`
    
    // 💡 使用 store.setGoogleAuth 統一管理
    store.setGoogleAuth(mockToken, 'forge_fit_sandbox@gmail.com')
    isMockMode.value = true

    triggerCelebrate(60)

    if (!isLocalhost.value) {
        await dialogStore.alert(
            '💡 提示：由於您目前在外部網域上運行，系統已自動為您配置「模擬沙盒測試 Token」以確保流暢體驗。',
            '模擬沙盒模式',
            { type: 'warning' }
        )
    } else {
        await dialogStore.alert(
            '💡 已進入沙盒測試模式！系統已自動為您配置虛擬模擬 Token。\n（若需連結真實雲端，請確保在 http://localhost:5173 上運行本機端）',
            '模擬沙盒模式',
            { type: 'info' }
        )
    }
}

/**
 * 解除 Google 帳號綁定並清除本地快取之 Access Token 與用戶資料 (支援二次彈窗雙軌選擇)
 */
const handleDisconnect = async (confirmRequired: boolean | any = true) => {
    const isConfirmNeeded = confirmRequired === false ? false : true
    if (isConfirmNeeded) {
        const confirmDisc = await dialogStore.confirm(
            '確定要解除 Google 雲端帳號連結嗎？',
            '解除雲端連結',
            { type: 'warning' }
        )
        if (!confirmDisc) return

        const shouldWipeLocal = await dialogStore.confirm(
            '⚠️ 您要一併「清空本機的所有重訓日誌紀錄」嗎？\n\n- 確定：將同步抹除本地日誌與雲端連結（徹底重置）。\n- 取消：僅解除連結，本地重訓日誌依舊安全保留。',
            '清空本地紀錄？',
            { type: 'danger', confirmText: '確定清空', cancelText: '保留紀錄' }
        )

        store.disconnectGoogle(shouldWipeLocal)
    } else {
        store.disconnectGoogle(false)
    }
}

/**
 * ⚡ 立即同步並上傳本地重訓資料庫備份至 Google 雲端硬碟 (支援真實與沙盒模擬)
 */
const handleUploadSync = async () => {
    if (!accessToken.value) return
    try {
        const success = await store.syncUpload()
        if (success) {
            triggerCelebrate(80)

            if (isMockMode.value) {
                await dialogStore.alert(
                    '💡 沙盒同步模擬成功！\n（⚠️ 注意：當前在沙盒模式下，資料僅加密暫存於本地快取，並未真正上傳至 Google 雲端硬碟！）',
                    '模擬備份成功',
                    { type: 'warning' }
                )
            } else {
                await dialogStore.alert(
                    '您的重訓歷史資料已安全備份至 Google Drive 的專屬應用程式隱密區 (AppData Folder)。\n\n💡 為了防範您不小心在 Google Drive 網頁上將備份 JSON 檔誤刪，Google 預設將此專區隱藏。雖然您在雲端硬碟網頁上看不到此檔案，但本 App 隨時可以完美為您下載還原！',
                    '雲端備份成功',
                    { type: 'success' }
                )
            }
        }
    } catch (error) {
        console.error('上傳備份失敗:', error)
        await dialogStore.alert('雲端備份同步失敗，請確認您的網路狀況或重新綁定帳號！', '備份失敗', { type: 'danger' })
    }
}

/**
 * ⚡ 立即從 Google 雲端硬碟下載已儲存的備份，還原並覆蓋本地資料庫
 */
const handleDownloadRestore = async () => {
    if (!accessToken.value) return
    const confirmRestore = await dialogStore.confirm(
        '⚠️ 警告！這將會完全覆蓋您當前本機的所有重訓日誌紀錄！\n確定要從雲端備份進行整包還原嗎？',
        '確認還原備份',
        { type: 'danger', confirmText: '確定還原', cancelText: '取消' }
    )
    if (!confirmRestore) return

    try {
        const success = await store.syncRestore()
        if (success) {
            triggerCelebrate(100)
            await dialogStore.alert(
                '💚 本地重訓日誌已與雲端同步。\n應用程式即將重新載入以更新看板與日誌視圖！',
                '備份還原成功',
                { type: 'success' }
            )

            // 1 秒後重載頁面以刷新全局資料流
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        }
    } catch (error: any) {
        console.error('還原備份失敗:', error)
        await dialogStore.alert(error?.message || '雲端資料還原失敗，請檢查備份狀態後重試！', '還原失敗', { type: 'danger' })
    }
}


</script>

<template>
    <div class="settings-page-wrapper" style="animation: fadeInUp 0.4s ease forwards">

        <!-- ==================================================== -->
        <!-- 💡 設定主選單 (Menu View) -->
        <!-- ==================================================== -->
        <div v-if="currentView === 'menu'" class="settings-menu-list" style="animation: fadeIn 0.3s ease">
            <!-- 選項一：Google Drive 備份 -->
            <div @click="currentView = 'google'" class="settings-menu-item glass-card">
                <div class="menu-icon-box bg-cyan-soft">
                    <Cloud :size="20" class="text-cyan glow-cyan" />
                </div>
                <div class="menu-text-box">
                    <h4>Google Drive 雲端備份</h4>
                    <p>備份與還原重訓日誌，防當機與資料遺失</p>
                </div>
                <ChevronRight :size="18" class="menu-chevron" />
            </div>

            <!-- 選項二：組間休息設定 -->
            <div @click="currentView = 'timer'" class="settings-menu-item glass-card">
                <div class="menu-icon-box bg-orange-soft">
                    <Timer :size="20" class="text-orange glow-orange" />
                </div>
                <div class="menu-text-box">
                    <h4>組間休息計時器</h4>
                    <p>設定勾選完成組數時，自動觸發的倒數時長</p>
                </div>
                <ChevronRight :size="18" class="menu-chevron" />
            </div>
        </div>

        <!-- ==================================================== -->
        <!-- 💡 詳細頁：Google Drive 雲端備份控制面板 -->
        <!-- ==================================================== -->
        <div v-else-if="currentView === 'google'" class="settings-detail-view" style="animation: slideInRight 0.3s ease forwards">
            <!-- 返回主選單按鈕 -->
            <button @click="currentView = 'menu'" class="btn-settings-back">
                <ChevronLeft :size="16" />
                <span>返回設定選單</span>
            </button>

            <div class="settings-section">
                <div class="section-title">
                    <Cloud :size="18" class="text-cyan" />
                    <h3>Google Drive 雲端硬碟備份</h3>
                </div>

                <!-- 場景 A：尚未綁定 -->
                <div v-if="!isLinked" class="connect-dashed-box" style="animation: fadeIn 0.3s ease">
                    <CloudLightning :size="32" class="text-muted" style="margin-bottom: 0.75rem" />
                    <p class="connect-desc">
                        尚未連結您的 Google 帳號，重訓紀錄目前僅暫存於本機瀏覽器中。
                    </p>
                    <p class="connect-sub-desc">
                        綁定後，資料將加密同步至您專屬的隱私雲端區，手汗手機當機亦無懼！
                    </p>

                    <button @click="handleConnectGoogle" class="btn btn-primary connect-google-btn">
                        <svg class="google-svg" viewBox="0 0 24 24" width="18" height="18">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span>{{ connectBtnText }}</span>
                    </button>
                </div>

                <!-- 場景 B：已成功綁定 -->
                <div
                    v-else
                    class="linked-dashboard-box"
                    :class="{ 'mock-dashboard-border': isMockMode }"
                    style="animation: fadeIn 0.3s ease"
                >
                    <div class="user-status-row">
                        <div class="status-indicator">
                            <UserCheck
                                v-if="!isMockMode"
                                class="text-green"
                                :size="20"
                                style="filter: drop-shadow(0 0 4px var(--color-success))"
                            />
                            <AlertTriangle
                                v-else
                                class="text-warning"
                                :size="20"
                                style="filter: drop-shadow(0 0 4px #fbbc05)"
                            />
                            <div>
                                <div class="email-text" :title="userEmail">{{ userEmail }}</div>
                                <div
                                    class="status-badge-green"
                                    :class="{ 'status-badge-mock': isMockMode }"
                                >
                                    雲端帳號已綁定
                                    <span v-if="isMockMode" class="mock-tag"
                                        >(沙盒模擬模式 - 資料暫存本地)</span
                                    >
                                    <span v-else class="mock-tag"
                                        >(真實 OAuth 2.0 模式 - 100% 雲端備份)</span
                                    >
                                </div>
                            </div>
                        </div>
                        <!-- 登出按鈕 -->
                        <button @click="handleDisconnect" class="btn-disconnect" title="解除綁定帳號">
                            <LogOut :size="16" />
                            <span>解除綁定</span>
                        </button>
                    </div>

                    <!-- 備份與同步控制排 -->
                    <div class="sync-actions-row">
                        <!-- 上傳備份 -->
                        <button
                            @click="handleUploadSync"
                            class="btn btn-secondary sync-btn"
                            :disabled="isSyncing || isRestoring"
                        >
                            <RefreshCw :size="16" :class="{ 'rotating-sync': isSyncing }" />
                            <span>{{ isSyncing ? '同步備份中...' : '立即上傳備份' }}</span>
                        </button>

                        <!-- 下載還原 -->
                        <button
                            @click="handleDownloadRestore"
                            class="btn btn-outline-warn restore-btn"
                            :disabled="isSyncing || isRestoring"
                        >
                            <RefreshCw :size="16" :class="{ 'rotating-sync': isRestoring }" />
                            <span>{{ isRestoring ? '雲端下載中...' : '從雲端下載還原' }}</span>
                        </button>
                    </div>

                    <!-- 同步時間戳記與提示 -->
                    <div class="sync-footer">
                        <div class="sync-time">
                            上次同步時間：<strong>{{ lastSyncedTime }}</strong>
                        </div>
                        <div class="sync-security-hint">
                            <ShieldCheck
                                :size="14"
                                :class="isMockMode ? 'text-warning' : 'text-green'"
                            />
                            <span v-if="isMockMode"
                                >本地模擬：備份將存於本地快取，在 localhost
                                網域下將自動解鎖真實雲端同步。</span
                            >
                            <span v-else
                                >隱私保護：備份會加密存儲至您的 Google Drive
                                隱藏應用數據區 (AppData)，可防誤刪且完全保護隱私。</span
                            >
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================================================== -->
        <!-- 💡 詳細頁：組間休息設定面版 -->
        <!-- ==================================================== -->
        <div v-else-if="currentView === 'timer'" class="settings-detail-view" style="animation: slideInRight 0.3s ease forwards">
            <!-- 返回主選單按鈕 -->
            <button @click="currentView = 'menu'" class="btn-settings-back">
                <ChevronLeft :size="16" />
                <span>返回設定選單</span>
            </button>

            <div class="settings-section">
                <div class="section-title">
                    <Timer :size="18" class="text-orange" />
                    <h3>組間休息計時器設定</h3>
                </div>

                <div class="rest-settings-console">
                    <p class="settings-intro">
                        設定當您在訓練日誌頁面中將某組勾選「完成」時，系統自動啟動的倒數休息秒數。
                    </p>

                    <!-- 當前數值霓虹看板 -->
                    <div class="settings-value-display">
                        <span class="value-number">{{ formattedGlobalRestDuration.total }}</span>
                        <span class="value-unit">秒</span>
                        <span class="value-formatted">
                            ({{ formattedGlobalRestDuration.mins }} 分 {{ formattedGlobalRestDuration.secs }} 秒)
                        </span>
                    </div>

                    <!-- 微調與滑桿控制 -->
                    <div class="settings-adjust-row">
                        <button 
                            @click="timerStore.setGlobalRestDuration(Math.max(10, formattedGlobalRestDuration.total - 15))"
                            class="btn-adjust-value"
                            :disabled="formattedGlobalRestDuration.total <= 10"
                        >
                            <Minus :size="14" />
                            <span>-15s</span>
                        </button>
                        
                        <input 
                            type="range" 
                            min="10" 
                            max="600" 
                            step="5" 
                            :value="formattedGlobalRestDuration.total"
                            @input="(e) => timerStore.setGlobalRestDuration(Number((e.target as HTMLInputElement).value))"
                            class="duration-range-slider"
                        />

                        <button 
                            @click="timerStore.setGlobalRestDuration(Math.min(600, formattedGlobalRestDuration.total + 15))"
                            class="btn-adjust-value"
                            :disabled="formattedGlobalRestDuration.total >= 600"
                        >
                            <Plus :size="14" />
                            <span>+15s</span>
                        </button>
                    </div>

                    <!-- 一鍵快速選取 -->
                    <div class="quick-select-duration">
                        <div class="quick-select-label">快速選擇常用時間：</div>
                        <div class="quick-select-grid">
                            <button 
                                @click="timerStore.setGlobalRestDuration(60)" 
                                class="btn-quick-duration"
                                :class="{ active: globalRestDuration === 60 }"
                            >
                                60 秒 (1分)
                            </button>
                            <button 
                                @click="timerStore.setGlobalRestDuration(90)" 
                                class="btn-quick-duration"
                                :class="{ active: globalRestDuration === 90 }"
                            >
                                90 秒 (1.5分)
                            </button>
                            <button 
                                @click="timerStore.setGlobalRestDuration(120)" 
                                class="btn-quick-duration"
                                :class="{ active: globalRestDuration === 120 }"
                            >
                                120 秒 (2分)
                            </button>
                            <button 
                                @click="timerStore.setGlobalRestDuration(180)" 
                                class="btn-quick-duration"
                                :class="{ active: globalRestDuration === 180 }"
                            >
                                180 秒 (3分)
                            </button>
                            <button 
                                @click="timerStore.setGlobalRestDuration(300)" 
                                class="btn-quick-duration"
                                :class="{ active: globalRestDuration === 300 }"
                            >
                                300 秒 (5分)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 💡 霓虹發光粒子雨畫布 -->
        <canvas v-if="isCanvasActive" ref="confettiCanvas" class="settings-confetti-canvas"></canvas>
    </div>
</template>

<style scoped>
.settings-page-wrapper {
    position: relative;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

/* ⚙️ 設定主選單樣式 */
.settings-menu-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.settings-menu-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    background: rgba(18, 22, 36, 0.45);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.settings-menu-item:hover {
    border-color: rgba(0, 240, 255, 0.22);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 240, 255, 0.08), inset 0 0 10px rgba(0, 240, 255, 0.03);
}

.menu-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    flex-shrink: 0;
}

.bg-cyan-soft {
    background: rgba(0, 240, 255, 0.08);
    border: 1px solid rgba(0, 240, 255, 0.15);
}

.bg-orange-soft {
    background: rgba(255, 122, 0, 0.08);
    border: 1px solid rgba(255, 122, 0, 0.15);
}

.menu-text-box {
    flex: 1;
    text-align: left;
    min-width: 0;
}

.menu-text-box h4 {
    font-size: 0.9rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.25rem 0;
}

.menu-text-box p {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-chevron {
    color: var(--text-muted);
    transition: all 0.2s ease;
}

.settings-menu-item:hover .menu-chevron {
    color: var(--color-cyan);
    transform: translateX(3px);
}

/* ⬅️ 返回選單按鈕 */
.btn-settings-back {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: none;
    color: var(--color-cyan);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 0.5rem;
    padding: 6px 12px;
    border-radius: 6px;
    transition: all 0.2s;
    align-self: flex-start;
    border: 1px solid rgba(0, 240, 255, 0.1);
    background: rgba(0, 240, 255, 0.02);
}

.btn-settings-back:hover {
    background: rgba(0, 240, 255, 0.08);
    border-color: rgba(0, 240, 255, 0.25);
    box-shadow: 0 0 8px rgba(0, 240, 255, 0.15);
}

/* ⏳ 休息時間設定介面 */
.rest-settings-console {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 0;
}

.settings-intro {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    margin-bottom: 1.75rem;
    line-height: 1.5;
}

.settings-value-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.2rem;
    margin-bottom: 1.75rem;
}

.value-number {
    font-size: 3rem;
    font-weight: 800;
    color: #ff7a00;
    text-shadow: 0 0 15px rgba(255, 122, 0, 0.45);
    font-family: monospace;
    line-height: 1;
}

.value-unit {
    font-size: 0.95rem;
    font-weight: 700;
    color: #ff7a00;
    margin-left: 2px;
}

.value-formatted {
    font-size: 0.8rem;
    color: var(--text-sub);
    margin-left: 0.6rem;
}

.settings-adjust-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 0.85rem;
    margin-bottom: 2rem;
}

.btn-adjust-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 38px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: var(--text-main);
    font-size: 0.72rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-adjust-value:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 122, 0, 0.35);
    color: #ff7a00;
}

.btn-adjust-value:disabled {
    opacity: 0.25;
    cursor: not-allowed;
}

.duration-range-slider {
    flex: 1;
    -webkit-appearance: none;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    outline: none;
}

.duration-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ff7a00;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(255, 122, 0, 0.8);
    transition: transform 0.1s;
}

.duration-range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
}

.quick-select-duration {
    width: 100%;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    padding-top: 1.25rem;
}

.quick-select-label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-sub);
    margin-bottom: 0.85rem;
    text-align: left;
}

.quick-select-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.btn-quick-duration {
    flex: 1;
    min-width: 90px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    color: var(--text-main);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.65rem 0;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-quick-duration:hover {
    background: rgba(255, 122, 0, 0.05);
    border-color: rgba(255, 122, 0, 0.2);
    color: #ff7a00;
}

.btn-quick-duration.active {
    background: rgba(255, 122, 0, 0.12) !important;
    border-color: #ff7a00 !important;
    color: #ff7a00 !important;
    font-weight: 700;
    box-shadow: 0 0 10px rgba(255, 122, 0, 0.15);
}

.text-orange {
    color: #ff7a00 !important;
}

.glow-orange {
    filter: drop-shadow(0 0 4px rgba(255, 122, 0, 0.4));
}

/* Slide in sub-view animation */
@keyframes slideInRight {
    from {
        transform: translateX(12px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.settings-section {
    background: rgba(18, 22, 36, 0.45);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.settings-section:hover {
    border-color: rgba(0, 240, 255, 0.15);
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.05);
}

.section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
}

.section-title h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
}

/* 虛線綁定卡片 */
.connect-dashed-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem 1rem;
    text-align: center;
    background: rgba(8, 10, 16, 0.2);
}

.connect-desc {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 0.25rem;
}

.connect-sub-desc {
    font-size: 0.78rem;
    color: var(--text-sub);
    margin-bottom: 1.5rem;
}

.connect-google-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 0.65rem 1.25rem;
    border-radius: 25px;
    background: #fff !important;
    color: #121624 !important;
    border: none;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
}

.connect-google-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.google-svg {
    display: block;
}

/* 已連結控制面板 */
.linked-dashboard-box {
    border: 1px solid rgba(0, 240, 255, 0.15);
    border-radius: 12px;
    padding: 1.25rem;
    background: rgba(0, 240, 255, 0.01);
    box-shadow: inset 0 0 15px rgba(0, 240, 255, 0.02);
}

.user-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center; /* ➔ 對齊中心，更精緻 */
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 1rem;
    margin-bottom: 1.25rem;
    gap: 1rem;
}

.status-indicator {
    display: flex;
    align-items: center; /* ➔ 改為 center，圖示與信箱完美對齊 */
    gap: 0.75rem;
    min-width: 0; /* ➔ 關鍵：防止 flex 子元素溢出 */
}

.email-text {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
    /* 💡 新增信箱太長時的優雅防溢出省略號 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 280px;
}

.status-badge-green {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-success);
    margin-top: 0.25rem;
}

.mock-tag {
    color: var(--color-cyan);
    font-weight: 500;
}

.btn-disconnect {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.btn-disconnect:hover {
    color: var(--color-danger);
    background: rgba(255, 74, 74, 0.08);
}

.sync-actions-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
}

.sync-btn,
.restore-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 700;
    height: 42px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.restore-btn {
    border: 1px solid rgba(255, 74, 74, 0.3) !important;
    color: var(--color-danger) !important;
    background: rgba(255, 74, 74, 0.03) !important;
}

.restore-btn:hover:not(:disabled) {
    background: rgba(255, 74, 74, 0.1) !important;
    border-color: var(--color-danger) !important;
    box-shadow: 0 0 10px rgba(255, 74, 74, 0.15);
}

/* 同步旋轉動畫 */
.rotating-sync {
    animation: spin 1.2s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.sync-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    padding-top: 0.75rem;
}

.sync-time {
    font-size: 0.78rem;
    color: var(--text-sub);
    margin-bottom: 0.5rem;
}

.sync-time strong {
    color: #fff;
}

.sync-security-hint {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    line-height: 1.4;
}





/* 霓虹粒子 Canvas */
.settings-confetti-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
}

/* 💡 沙盒模擬模式專屬霓虹邊框與 Badge 狀態 */
.mock-dashboard-border {
    border: 1px dashed rgba(251, 188, 5, 0.3) !important;
    background: rgba(251, 188, 5, 0.01) !important;
    box-shadow: inset 0 0 15px rgba(251, 188, 5, 0.03) !important;
}

.status-badge-mock {
    color: #fbbc05 !important;
}

@media (max-width: 576px) {
    .settings-page-wrapper {
        padding-bottom: 100px; /* 💡 確保設定頁面底部在手機上不會被 fixed 底部導覽列擋住 */
    }

    .settings-section {
        padding: 1rem;
    }

    /* 💡 手機版同步按鈕垂直排列，提供超大且好按的點擊觸感 */
    .sync-actions-row {
        grid-template-columns: 1fr;
        gap: 0.6rem;
    }

    /* 💡 手機版信箱與按鈕改為垂直分流排列，徹底根除左右擠壓跑版 */
    .user-status-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.85rem;
    }

    .status-indicator {
        min-width: 100%;
    }

    .email-text {
        max-width: 100%; /* 手機版拉滿 */
    }

    .btn-disconnect {
        align-self: flex-start;
        padding: 6px 12px;
        background: rgba(255, 74, 74, 0.04);
        border: 1px solid rgba(255, 74, 74, 0.1);
        width: 100%;
        justify-content: center;
    }
}
</style>
