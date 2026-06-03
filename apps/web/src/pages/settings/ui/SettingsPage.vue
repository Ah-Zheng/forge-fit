<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkoutStore } from '../../../entities/workout'
import {
    Cloud,
    CloudLightning,
    RefreshCw,
    UserCheck,
    LogOut,
    AlertTriangle,
    ShieldCheck
} from '@lucide/vue'
/** 💡 導入我們手寫的高性能 Canvas 霓虹粒子引擎 */
import { NeonConfetti } from '../../../shared/lib/confetti'

/** 💡 防禦性 LocalStorage 包裝，提供 100% 強型別且無 any 斷言的安全瀏覽器/Node 相容設計 */
const storage: Storage =
    typeof window !== 'undefined'
        ? window.localStorage
        : {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {},
            length: 0,
            key: () => null
        }

// 💡 引入 Pinia 全局狀態
const store = useWorkoutStore()
const {
    accessToken,
    isLinked,
    userEmail,
    lastSyncedTime,
    isSyncing,
    isRestoring,
    isMockMode
} = storeToRefs(store)

/** 💡 從 Vite 環境變數動態載入 Google Client ID，避免憑證硬編碼暴露在程式碼中，符合現代 Web 安全防禦工程實踐！ */
const DEFAULT_CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || ''

/** 💡 使用者自訂的真實憑證金鑰 (從 LocalStorage 讀寫，實現 100% 真實綁定！) */
const customClientId = ref('')

/** 是否已儲存使用者自訂憑證金鑰 */
const isSavedKey = ref(false)

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
    return isSavedKey.value || isLocalhost.value
})

/** 💡 依據連線與憑證狀態，動態決定的綁定按鈕呈現文字 */
const connectBtnText = computed(() => {
    if (canUseRealOAuth.value) {
        return '連結真實 Google 帳號 🟢'
    }
    return '開啟模擬沙盒同步 (推薦貼上真實金鑰)'
})

onMounted(() => {
    // 💡 初始化 Store
    store.initStore()

    /** 💡 檢查是否有自訂的真實 Google Client ID */
    const savedCustomKey = storage.getItem('forge-fit-custom-client-id')
    if (savedCustomKey) {
        customClientId.value = savedCustomKey
        isSavedKey.value = true
    }

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

    const activeClientId = customClientId.value || DEFAULT_CLIENT_ID

    // 💡 如果在非 localhost 的生產/自訂網域，且沒有貼上自訂 Client ID，則直接維持沙盒模式，防止拉起真實 GIS 時 Google 報錯
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
                    alert(`Google 帳號連結失敗，請確認您的網路狀況！\n錯誤碼：${response.error}`)
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
                alert('🟢 恭喜！真實 Google 帳號成功綁定！現已開啟 100% 真實雲端硬碟備份還原功能。')
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
const startSandboxMode = () => {
    const mockToken = `mock-token-${Date.now()}`
    
    // 💡 使用 store.setGoogleAuth 統一管理
    store.setGoogleAuth(mockToken, 'forge_fit_sandbox@gmail.com')
    isMockMode.value = true

    triggerCelebrate(60)

    if (!isLocalhost.value && !isSavedKey.value) {
        alert(
            '💡 提示：由於您目前在外部網域上運行，且尚未設定「Google 開發者金鑰」，系統已自動為您配置「模擬沙盒測試 Token」。\n\n若需真正備份至 Google Drive，請在下方設定面板中，依 3 步驟教學建立並儲存您專屬的 Client ID 金鑰！'
        )
    } else {
        alert(
            '💡 已進入沙盒測試模式！系統已自動為您配置虛擬模擬 Token。\n（若需連結真實雲端，請確保在 http://localhost:5173 上運行本機端）'
        )
    }
}

/**
 * 解除 Google 帳號綁定並清除本地快取之 Access Token 與用戶資料 (支援二次彈窗雙軌選擇)
 */
const handleDisconnect = (confirmRequired: boolean | any = true) => {
    const isConfirmNeeded = confirmRequired === false ? false : true
    if (isConfirmNeeded) {
        if (!confirm('確定要解除 Google 雲端帳號連結嗎？')) {
            return
        }

        const shouldWipeLocal = confirm(
            '⚠️ 您要一併「清空本機的所有重訓日誌紀錄」嗎？\n\n- 點選 [確定]：將同步抹除本地日誌與雲端連結（徹底重置）。\n- 點選 [取消]：僅解除 Google 帳號連結，本地重訓日誌依舊安全保留。'
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
                alert(
                    '💡 沙盒同步模擬成功！\n（⚠️ 注意：當前在沙盒模式下，資料僅加密暫存於本地快取，並未真正上傳至 Google 雲端硬碟！）'
                )
            } else {
                alert(
                    '🎉 雲端備份成功！\n\n您的重訓歷史資料已安全備份至 Google Drive 的專屬應用程式隱密區 (AppData Folder)。\n\n💡 為了防範您不小心在 Google Drive 網頁上將備份 JSON 檔誤刪，Google 預設將此專區隱藏。雖然您在雲端硬碟網頁上看不到此檔案，但本 App 隨時可以完美為您下載還原！'
                )
            }
        }
    } catch (error) {
        console.error('上傳備份失敗:', error)
        alert('雲端備份同步失敗，請確認您的網路狀況或重新綁定帳號！')
    }
}

/**
 * ⚡ 立即從 Google 雲端硬碟下載已儲存的備份，還原並覆蓋本地資料庫
 */
const handleDownloadRestore = async () => {
    if (!accessToken.value) return
    if (
        !confirm(
            '⚠️ 警告！這將會完全覆蓋您當前本機的所有重訓日誌紀錄！\n確定要從雲端備份進行整包還原嗎？'
        )
    )
        return

    try {
        const success = await store.syncRestore()
        if (success) {
            triggerCelebrate(100)
            alert(
                '💚 備份還原成功！本地重訓日誌已與雲端同步。\n應用程式即將重新載入以更新看板與日誌視圖！'
            )

            // 1 秒後重載頁面以刷新全局資料流
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        }
    } catch (error: any) {
        console.error('還原備份失敗:', error)
        alert(error?.message || '雲端資料還原失敗，請檢查備份狀態後重試！')
    }
}


</script>

<template>
    <div class="settings-page-wrapper" style="animation: fadeInUp 0.4s ease forwards">

        <!-- 💡 區塊一：Google Drive 雲端備份控制面板 -->
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

/* 🔑 Google 開發者金鑰設定面板樣式 */
.credential-setup-box {
    background: rgba(255, 255, 255, 0.01);
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1.25rem;
}

.credential-desc {
    font-size: 0.8rem;
    color: var(--text-sub);
    line-height: 1.5;
}

.client-id-input-group {
    display: flex;
    gap: 0.5rem;
}

.client-id-text-input {
    flex: 1;
    background: rgba(8, 10, 16, 0.7);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    color: #fff;
    font-size: 0.82rem;
    outline: none;
    transition: all 0.2s ease;
    min-width: 0;
}

.client-id-text-input:focus:not(:disabled) {
    border-color: rgba(0, 240, 255, 0.4);
    box-shadow: 0 0 8px rgba(0, 240, 255, 0.15);
}

.client-id-text-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.02);
    border-color: transparent;
    color: var(--text-muted);
}

.save-key-btn,
.clear-key-btn {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0 1.2rem;
    border-radius: 8px;
    height: 38px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
}

.key-status-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    line-height: 1.4;
}

/* OAuth 教學選單 */
.oauth-guide-details {
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    padding-top: 1rem;
}

.oauth-guide-summary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-cyan);
    cursor: pointer;
    user-select: none;
    transition: color 0.2s ease;
}

.oauth-guide-summary:hover {
    color: #fff;
    filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.3));
}

.oauth-guide-content {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(8, 10, 16, 0.5);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.03);
    font-size: 0.75rem;
    color: var(--text-sub);
    line-height: 1.6;
}

.oauth-guide-content ol {
    padding-left: 1.25rem;
}

.oauth-guide-content li {
    margin-bottom: 0.5rem;
}

.oauth-guide-content li:last-child {
    margin-bottom: 0;
}

.oauth-guide-content ul {
    padding-left: 1.25rem;
    margin-top: 0.25rem;
    list-style-type: circle;
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
