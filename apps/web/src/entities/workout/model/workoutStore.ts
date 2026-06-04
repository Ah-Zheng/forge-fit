import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { 
    initDatabase, 
    getWorkoutByDate, 
    saveWorkout, 
    getExercisesLibrary,
    uploadBackup,
    downloadBackup
} from '@forge-fit/core'
import type { WorkoutSession, ExerciseDef } from '@forge-fit/types'
import { useDialogStore } from '../../../shared/ui/dialog/dialogStore'

export const useWorkoutStore = defineStore('workout', () => {
    // ----------------------------------------------------
    // 💡 1. 狀態定義 (State)
    // ----------------------------------------------------
    const workoutDate = ref('')
    const todaySession = ref<WorkoutSession>({ date: '', exercises: [], duration: 0 })
    const exercisesLibrary = ref<ExerciseDef[]>([])
    
    // 全局計時狀態 (對齊實際的今天 actualTodayStr)
    const globalIsTimerActive = ref(false)
    const globalSecondsElapsed = ref(0)
    const globalLiveSeconds = ref(0)
    const globalTimerStartedAt = ref<number | undefined>(undefined)
    const actualTodayStr = ref('')
    
    // Google Drive 雲端備份與 OAuth 帳號授權狀態
    const accessToken = ref('')
    const userEmail = ref('')
    const isLinked = ref(false)
    const isMockMode = ref(false)
    const lastSyncedTime = ref('')
    
    // 立即同步與還原的 Loading 狀態
    const isSyncing = ref(false)
    const isRestoring = ref(false)
    
    // 💡 解決重置失效的「防寫安全鎖」，徹底防範頁面 unmount 重新整理時 deep watch 回寫舊數據
    const isResetLock = ref(false)

    // 💡 控制 Logger 頁面挑選抽屜開啟狀態
    const isLoggerDrawerOpen = ref(false)

    // ----------------------------------------------------
    // 💡 2. 初始化 store 與 LocalStorage 快取同步 (Actions)
    // ----------------------------------------------------
    const initStore = () => {
        // 💡 檢查是否有來自 reset 重新整理的防寫鎖
        const hasResetLock = localStorage.getItem('forge-fit-reset-lock') === 'true'
        
        if (hasResetLock) {
            isResetLock.value = false
            localStorage.removeItem('forge-fit-reset-lock')
        } else {
            isResetLock.value = false
        }

        initDatabase()
        
        // 預設編輯日期為今日 (格式為 YYYY-MM-DD)
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const todayStr = `${yyyy}-${mm}-${dd}`
        
        // 載入基準狀態
        workoutDate.value = todayStr
        const todaySess = getWorkoutByDate(todayStr)
        todaySession.value = todaySess
        exercisesLibrary.value = getExercisesLibrary()
        
        // 初始化全局計時狀態
        actualTodayStr.value = todayStr
        globalSecondsElapsed.value = todaySess.secondsElapsed || (todaySess.duration || 0) * 60
        globalLiveSeconds.value = globalSecondsElapsed.value
        globalIsTimerActive.value = todaySess.isTimerActive || false
        globalTimerStartedAt.value = todaySess.timerStartedAt
        
        // 從 LocalStorage 還原 Google Drive 帳號快取與同步標記
        accessToken.value = localStorage.getItem('forge-fit-google-token') || ''
        userEmail.value = localStorage.getItem('forge-fit-google-email') || ''
        lastSyncedTime.value = localStorage.getItem('forge-fit-google-last-sync') || ''
        isLinked.value = !!accessToken.value
        
        // 判斷當前是否降級走模擬沙盒模式 (如果是 mock token 或者非 localhost 預設走模擬)
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')
        if (accessToken.value) {
            isMockMode.value = accessToken.value.startsWith('mock-token-')
        } else {
            isMockMode.value = !isLocal
        }
        
        // 如果原本是運行狀態，自動恢復跑秒
        if (globalIsTimerActive.value && globalTimerStartedAt.value) {
            resumeGlobalTimer()
        }
    }

    // 💡 定時器 Interval ID
    let globalTimerIntervalId: number | null = null

    // 💡 同步跑秒時間差值，並更新寫入實際今天的資料庫
    const syncGlobalTime = () => {
        let currentLiveSeconds = globalSecondsElapsed.value
        if (globalIsTimerActive.value && globalTimerStartedAt.value) {
            const diff = Math.floor((Date.now() - globalTimerStartedAt.value) / 1000)
            currentLiveSeconds = globalSecondsElapsed.value + diff
        }
        
        globalLiveSeconds.value = currentLiveSeconds
        
        const todayDate = actualTodayStr.value
        if (todayDate) {
            const sess = getWorkoutByDate(todayDate)
            sess.secondsElapsed = currentLiveSeconds
            sess.duration = Math.round(currentLiveSeconds / 60)
            sess.isTimerActive = globalIsTimerActive.value
            sess.timerStartedAt = globalTimerStartedAt.value
            sess.completed = todaySession.value.completed || false
            
            saveWorkout(todayDate, sess)
            
            // 💡 如果目前日誌頁剛好顯示「今天」，同步更新記憶體中的 todaySession 以免畫面沒同步
            if (workoutDate.value === todayDate) {
                todaySession.value.secondsElapsed = currentLiveSeconds
                todaySession.value.duration = sess.duration
                todaySession.value.isTimerActive = globalIsTimerActive.value
                todaySession.value.timerStartedAt = globalTimerStartedAt.value
                todaySession.value.completed = sess.completed
            }
        }
    }

    // 💡 開始全局計時器
    const startGlobalTimer = () => {
        if (globalTimerIntervalId) return
        globalIsTimerActive.value = true
        
        if (!globalTimerStartedAt.value) {
            globalTimerStartedAt.value = Date.now()
        }
        
        syncGlobalTime()
        
        globalTimerIntervalId = window.setInterval(() => {
            syncGlobalTime()
        }, 1000)
    }
    
    // 💡 暫停全局計時器
    const pauseGlobalTimer = () => {
        if (globalTimerIntervalId) {
            window.clearInterval(globalTimerIntervalId)
            globalTimerIntervalId = null
        }
        
        if (globalIsTimerActive.value && globalTimerStartedAt.value) {
            const diff = Math.floor((Date.now() - globalTimerStartedAt.value) / 1000)
            globalSecondsElapsed.value += diff
        }
        
        globalIsTimerActive.value = false
        globalTimerStartedAt.value = undefined
        
        syncGlobalTime()
    }
    
    // 💡 調整計時器時長 (分鐘差值，例如 +5 或 -5)
    const adjustGlobalDuration = (minutes: number) => {
        const newSeconds = globalSecondsElapsed.value + minutes * 60
        globalSecondsElapsed.value = Math.max(0, newSeconds)
        syncGlobalTime()
    }

    // 💡 恢復跑秒的輔助方法 (由 initStore 呼叫)
    const resumeGlobalTimer = () => {
        if (globalTimerIntervalId) return
        globalTimerIntervalId = window.setInterval(() => {
            syncGlobalTime()
        }, 1000)
    }

    // 💡 終止/結束今日訓練
    const endGlobalWorkout = () => {
        // 1. 暫停計時器
        pauseGlobalTimer()
        
        // 2. 將今日 session 狀態設為已完成
        const todayDate = actualTodayStr.value
        if (todayDate) {
            const sess = getWorkoutByDate(todayDate)
            sess.completed = true
            // 確保 secondsElapsed 與 duration 被同步鎖定
            sess.secondsElapsed = globalLiveSeconds.value
            sess.duration = Math.round(globalLiveSeconds.value / 60)
            sess.isTimerActive = false
            sess.timerStartedAt = undefined
            
            saveWorkout(todayDate, sess)
            
            // 更新目前頁面所呈現的資料狀態
            if (workoutDate.value === todayDate) {
                todaySession.value.completed = true
                todaySession.value.isTimerActive = false
                todaySession.value.timerStartedAt = undefined
            }
        }
    }

    // 💡 解鎖今日訓練以重新編輯
    const unlockGlobalWorkout = () => {
        const todayDate = actualTodayStr.value
        if (todayDate) {
            const sess = getWorkoutByDate(todayDate)
            sess.completed = false
            
            saveWorkout(todayDate, sess)
            
            if (workoutDate.value === todayDate) {
                todaySession.value.completed = false
            }
        }
    }

    // 💡 監聽當前編輯日期變更，自動重新從資料庫載入該日誌
    watch(workoutDate, (newDate, oldDate) => {
        // 🔒 在切換日期前，同步、強制將舊日期的修改存入資料庫，避免 Vue 異步 Watch 佇列合併造成資料丟失
        if (oldDate && todaySession.value && todaySession.value.date === oldDate) {
            saveWorkout(oldDate, todaySession.value)
        }
        if (newDate) {
            todaySession.value = getWorkoutByDate(newDate)
        }
    })

    // 💡 深度監聽 (Deep Watch) 訓練日誌物件，只要動作/組數/重量發生任何變更，微秒級寫入 LocalStorage
    watch(
        () => todaySession.value,
        (newSession) => {
            if (isResetLock.value) return // 🔒 若已開啟重置鎖，拒絕將記憶體中的舊數據寫回資料庫！
            if (newSession.date) {
                saveWorkout(newSession.date, newSession)
            }
        },
        { deep: true, flush: 'sync' }
    )

    // ----------------------------------------------------
    // 💡 3. 資料庫寫入與同步邏輯 (Business Logic Actions)
    // ----------------------------------------------------
    
    // 設定已綁定的 Google 憑證與用戶信箱
    const setGoogleAuth = (token: string, email: string) => {
        accessToken.value = token
        userEmail.value = email
        isLinked.value = true
        isMockMode.value = false
        localStorage.setItem('forge-fit-google-token', token)
        localStorage.setItem('forge-fit-google-email', email)
    }

    // 💡 立即上傳備份數據至 Google Drive (真實/沙盒模擬)
    const syncUpload = async () => {
        if (!accessToken.value) return false
        isSyncing.value = true
        try {
            const localDb = initDatabase()
            if (isMockMode.value) {
                // 沙盒模式模擬：延遲 1.2 秒展現 Loading 特效
                await new Promise(resolve => setTimeout(resolve, 1200))
                localStorage.setItem('forge-fit-sandbox-backup', JSON.stringify(localDb))
            } else {
                await uploadBackup(accessToken.value, localDb)
            }
            
            // 記錄同步時間戳記
            const now = new Date()
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            lastSyncedTime.value = timeStr
            localStorage.setItem('forge-fit-google-last-sync', timeStr)
            return true
        } catch (error) {
            console.error('syncUpload 發生錯誤:', error)
            throw error
        } finally {
            isSyncing.value = false
        }
    }

    // 💡 從 Google Drive 下載最新備份並還原本地資料庫 (真實/沙盒模擬)
    const syncRestore = async () => {
        if (!accessToken.value) return false
        isRestoring.value = true
        try {
            if (isMockMode.value) {
                await new Promise(resolve => setTimeout(resolve, 1200))
                const mockData = localStorage.getItem('forge-fit-sandbox-backup')
                if (mockData) {
                    localStorage.setItem('forge-fit-database-v1', mockData)
                } else {
                    throw new Error('模擬沙盒雲端尚未有任何備份檔案！')
                }
            } else {
                const cloudDb = await downloadBackup(accessToken.value)
                if (cloudDb) {
                    localStorage.setItem('forge-fit-database-v1', JSON.stringify(cloudDb))
                } else {
                    throw new Error('您的真實 Google 雲端硬碟尚未有任何備份檔案！')
                }
            }
            return true
        } catch (error) {
            console.error('syncRestore 發生錯誤:', error)
            throw error
        } finally {
            isRestoring.value = false
        }
    }

    // 💡 徹底抹除本地所有重訓紀錄與備份快取 (Danger Zone 重置所有數據)
    const resetDatabase = async () => {
        // 🔒 寫入防寫安全鎖，阻斷 unmount 重新整理時 Vue watch 競態回寫舊資料
        isResetLock.value = true
        localStorage.setItem('forge-fit-reset-lock', 'true')
        
        // 抹除 LocalStorage 所有關聯健值 (唯獨保留 forge-fit-reset-lock 標記)
        localStorage.removeItem('forge-fit-database-v1')
        localStorage.removeItem('forge-fit-google-token')
        localStorage.removeItem('forge-fit-google-email')
        localStorage.removeItem('forge-fit-google-last-sync')
        localStorage.removeItem('forge-fit-sandbox-backup')
        
        // 💡 警告：千萬不能在 reload 前呼叫 initStore() 或清除 reset-lock 緩存！
        const dialogStore = useDialogStore()
        await dialogStore.alert('🔥 本地數據與雲端綁定快取已徹底抹除！應用程式即將重新載入！', '重置成功', { type: 'success' })
        window.location.reload()
    }

    // 解除連結 Google 雲端帳號 (雙軌支援：僅解除連結，或解除並清空本地重訓紀錄)
    const disconnectGoogle = async (clearLocalData = false) => {
        if (clearLocalData) {
            await resetDatabase()
        } else {
            // 僅登出雲端，不影響本地重訓數據 (PWA 離線優先核心精神)
            accessToken.value = ''
            userEmail.value = ''
            isLinked.value = false
            localStorage.removeItem('forge-fit-google-token')
            localStorage.removeItem('forge-fit-google-email')
            localStorage.removeItem('forge-fit-google-last-sync')
            const dialogStore = useDialogStore()
            await dialogStore.alert('🟢 已解除 Google 雲端帳號連結！本地重訓日誌依舊安全保留在您的瀏覽器中。', '解除連結成功', { type: 'success' })
        }
    }

    // 重新載入百科動作庫
    const refreshLibrary = () => {
        exercisesLibrary.value = getExercisesLibrary()
    }

    // 💡 一鍵快加動作到今日訓練日誌
    const addExerciseToToday = (exercise: ExerciseDef) => {
        const exists = todaySession.value.exercises.some(ex => ex.exerciseId === exercise.id)

        if (!exists) {
            const defaultWeight = typeof exercise.targetWeight === 'number' ? exercise.targetWeight : 40
            const defaultReps = typeof exercise.targetReps === 'number' ? exercise.targetReps : 10
            
            todaySession.value.exercises.push({
                exerciseId: exercise.id,
                name: exercise.name,
                muscle: exercise.muscle,
                sets: [{ weight: defaultWeight, reps: defaultReps, completed: false }]
            })
        }
    }

    return {
        workoutDate,
        todaySession,
        exercisesLibrary,
        globalIsTimerActive,
        globalSecondsElapsed,
        globalLiveSeconds,
        globalTimerStartedAt,
        actualTodayStr,
        accessToken,
        userEmail,
        isLinked,
        isMockMode,
        lastSyncedTime,
        isSyncing,
        isRestoring,
        isResetLock,
        isLoggerDrawerOpen,
        initStore,
        setGoogleAuth,
        syncUpload,
        syncRestore,
        resetDatabase,
        disconnectGoogle,
        refreshLibrary,
        addExerciseToToday,
        startGlobalTimer,
        pauseGlobalTimer,
        adjustGlobalDuration,
        syncGlobalTime,
        endGlobalWorkout,
        unlockGlobalWorkout
    }
})
