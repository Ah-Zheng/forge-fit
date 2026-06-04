import { ref, onUnmounted, unref } from 'vue'
import { defineStore } from 'pinia'

export const useRestTimerStore = defineStore('restTimer', () => {
    // ----------------------------------------------------
    // 💡 1. 狀態定義 (State)
    // ----------------------------------------------------
    const isResting = ref(false)
    const timeLeft = ref(0)
    const totalDuration = ref(90)
    const activeExerciseName = ref('')
    const isPaused = ref(false)
    const globalRestDuration = ref(90)
    
    let timerIntervalId: any = null

    // ----------------------------------------------------
    // 💡 2. 音訊與通知相關方法 (Audio & Notification)
    // ----------------------------------------------------
    let audioCtx: AudioContext | null = null

    // 💡 初始化音訊上下文 (需在使用者互動事件中呼叫以解鎖瀏覽器限制)
    const initAudio = () => {
        if (typeof window === 'undefined') return
        try {
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
                if (AudioContextClass) {
                    audioCtx = new AudioContextClass()
                }
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume()
            }
            
            // 💡 iOS/macOS Safari 關鍵解鎖：在使用者手勢事件中「立即播放一個極短的靜音波形」！
            if (audioCtx) {
                const osc = audioCtx.createOscillator()
                const gain = audioCtx.createGain()
                osc.connect(gain)
                gain.connect(audioCtx.destination)
                gain.gain.setValueAtTime(0.0001, audioCtx.currentTime) // 近乎靜音
                osc.frequency.setValueAtTime(1, audioCtx.currentTime) // 1Hz 超低頻
                osc.start(0)
                osc.stop(audioCtx.currentTime + 0.01) // 播放 10 毫秒
            }
        } catch (e) {
            console.warn('音訊上下文解鎖失敗:', e)
        }
    }

    const playBeepSound = () => {
        if (typeof window === 'undefined') return
        initAudio()
        if (!audioCtx) return
        
        try {
            const currentCtx = audioCtx
            if (currentCtx.state === 'suspended') {
                currentCtx.resume()
            }
            
            const playBeep = (time: number, freq: number, duration: number) => {
                const osc = currentCtx.createOscillator()
                const gainNode = currentCtx.createGain()
                
                osc.connect(gainNode)
                gainNode.connect(currentCtx.destination)
                
                osc.type = 'sine'
                osc.frequency.value = freq
                
                gainNode.gain.setValueAtTime(0, time)
                gainNode.gain.linearRampToValueAtTime(0.3, time + 0.05)
                gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration)
                
                osc.start(time)
                osc.stop(time + duration)
            }
            
            const now = currentCtx.currentTime
            // 嗶—— 嗶—— 兩聲乾淨的電子音
            playBeep(now, 880, 0.15)
            playBeep(now + 0.25, 880, 0.15)
        } catch (e) {
            console.error('播放休息結束提示音效失敗:', e)
        }
    }

    const triggerVibration = () => {
        if (typeof window !== 'undefined' && navigator.vibrate) {
            // 震動 200ms，停 100ms，震動 200ms
            navigator.vibrate([200, 100, 200])
        }
    }

    const updateTabTitle = (seconds: number) => {
        if (typeof document === 'undefined') return
        if (isNaN(seconds) || seconds <= 0) {
            document.title = 'ForgeFit - 智能重訓日誌'
            return
        }
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        document.title = `【休息中 ${timeStr}】ForgeFit`
    }

    // ----------------------------------------------------
    // 💡 3. 離線與持久化存取 (Persistence Helpers with Self-Healing)
    // ----------------------------------------------------
    const loadGlobalRestDuration = () => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem('forge-fit-global-rest-duration')
        const val = Number(saved)
        if (saved && !isNaN(val) && val > 0) {
            globalRestDuration.value = val
        } else {
            globalRestDuration.value = 90
            localStorage.setItem('forge-fit-global-rest-duration', '90')
        }
    }

    const setGlobalRestDuration = (rawSeconds: number | any) => {
        const seconds = unref(rawSeconds)
        if (isNaN(seconds) || seconds <= 0) return
        globalRestDuration.value = seconds
        localStorage.setItem('forge-fit-global-rest-duration', String(seconds))
    }

    const saveTimerStateToStorage = (startedAt: number) => {
        if (isNaN(startedAt) || isNaN(totalDuration.value) || isNaN(timeLeft.value)) return
        localStorage.setItem('forge-fit-rest-is-resting', 'true')
        localStorage.setItem('forge-fit-rest-started-at', String(startedAt))
        localStorage.setItem('forge-fit-rest-total-duration', String(totalDuration.value))
        localStorage.setItem('forge-fit-rest-exercise-name', activeExerciseName.value || '下一組')
        localStorage.setItem('forge-fit-rest-is-paused', String(isPaused.value))
        localStorage.setItem('forge-fit-rest-time-left', String(timeLeft.value))
    }

    const clearTimerStateFromStorage = () => {
        localStorage.removeItem('forge-fit-rest-is-resting')
        localStorage.removeItem('forge-fit-rest-started-at')
        localStorage.removeItem('forge-fit-rest-total-duration')
        localStorage.removeItem('forge-fit-rest-exercise-name')
        localStorage.removeItem('forge-fit-rest-is-paused')
        localStorage.removeItem('forge-fit-rest-time-left')
    }

    const restoreTimerState = () => {
        if (typeof window === 'undefined') return
        
        loadGlobalRestDuration()

        const isRestingSaved = localStorage.getItem('forge-fit-rest-is-resting') === 'true'
        if (!isRestingSaved) return

        const rawStartedAt = localStorage.getItem('forge-fit-rest-started-at')
        const rawTotalDuration = localStorage.getItem('forge-fit-rest-total-duration')
        const exerciseName = localStorage.getItem('forge-fit-rest-exercise-name') || '下一組'
        const isPausedSaved = localStorage.getItem('forge-fit-rest-is-paused') === 'true'
        const rawTimeLeft = localStorage.getItem('forge-fit-rest-time-left')

        const startedAt = Number(rawStartedAt)
        const savedTotalDuration = Number(rawTotalDuration)
        const savedTimeLeft = Number(rawTimeLeft)

        // 💡 自我修復防禦機制：如果讀取出來的 localStorage 已經被 NaN 污染，或時間小於等於0，直接全盤重置，防止介面毀損
        if (
            isNaN(startedAt) || 
            isNaN(savedTotalDuration) || 
            isNaN(savedTimeLeft) ||
            savedTotalDuration <= 0 ||
            savedTimeLeft <= 0
        ) {
            clearTimerStateFromStorage()
            return
        }

        if (isPausedSaved) {
            isResting.value = true
            isPaused.value = true
            timeLeft.value = savedTimeLeft
            totalDuration.value = savedTotalDuration
            activeExerciseName.value = exerciseName
        } else {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000)
            if (elapsed < savedTotalDuration) {
                const remaining = savedTotalDuration - elapsed
                isResting.value = true
                timeLeft.value = remaining
                totalDuration.value = savedTotalDuration
                activeExerciseName.value = exerciseName
                isPaused.value = false

                // 帶入原有的 startedAt 重啟定時器
                startRest(remaining, exerciseName, startedAt)
            } else {
                // 已過期，直接清理
                clearTimerStateFromStorage()
            }
        }
    }

    // ----------------------------------------------------
    // 💡 4. 控制行為 (Actions)
    // ----------------------------------------------------
    const startRest = (rawSeconds: number | any, exerciseName = '下一組', recoveredStartedAt?: number) => {
        const seconds = unref(rawSeconds)
        if (isNaN(seconds) || seconds <= 0) return
        
        // 💡 關鍵：立即在使用者點擊的當下觸發音訊初始化，完成瀏覽器手勢授權解鎖！
        initAudio()

        // 防呆：先清空舊計時器
        stopRest()
        
        isResting.value = true
        timeLeft.value = seconds
        totalDuration.value = seconds
        activeExerciseName.value = exerciseName
        isPaused.value = false

        const startedAt = recoveredStartedAt || Date.now()
        saveTimerStateToStorage(startedAt)
        updateTabTitle(seconds)

        timerIntervalId = setInterval(() => {
            if (isPaused.value) return

            // 💡 自我防禦機制：若計時器運行時 timeLeft 突變為 NaN，直接強制歸零自愈，避免 UI 鎖死
            if (isNaN(timeLeft.value)) {
                timeLeft.value = 0
                stopRest()
                return
            }

            if (timeLeft.value > 1) {
                timeLeft.value--
                // 持續更新已流逝時間儲存，防重整
                localStorage.setItem('forge-fit-rest-time-left', String(timeLeft.value))
                updateTabTitle(timeLeft.value)
            } else {
                // 倒數歸零
                timeLeft.value = 0
                playBeepSound()
                triggerVibration()
                stopRest()
            }
        }, 1000)
    }

    const stopRest = () => {
        isResting.value = false
        timeLeft.value = 0
        isPaused.value = false
        updateTabTitle(0)
        clearTimerStateFromStorage()

        if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
        }
    }

    const pauseRest = () => {
        if (!isResting.value) return
        isPaused.value = true
        localStorage.setItem('forge-fit-rest-is-paused', 'true')
        localStorage.setItem('forge-fit-rest-time-left', String(timeLeft.value))
    }

    const resumeRest = () => {
        if (!isResting.value) return
        initAudio()
        isPaused.value = false
        // 暫停後恢復，重新計算並寫回 startedAt
        const newStartedAt = Date.now() - (totalDuration.value - timeLeft.value) * 1000
        localStorage.setItem('forge-fit-rest-is-paused', 'false')
        localStorage.setItem('forge-fit-rest-started-at', String(newStartedAt))
    }

    const addTime = (rawSeconds: number | any) => {
        const seconds = unref(rawSeconds)
        if (!isResting.value || isNaN(seconds)) return
        initAudio()
        timeLeft.value += seconds
        totalDuration.value += seconds
        
        const rawStartedAt = localStorage.getItem('forge-fit-rest-started-at')
        const currentStartedAt = Number(rawStartedAt)
        const newStartedAt = isNaN(currentStartedAt) ? Date.now() - seconds * 1000 : currentStartedAt - seconds * 1000
        
        localStorage.setItem('forge-fit-rest-started-at', String(newStartedAt))
        localStorage.setItem('forge-fit-rest-total-duration', String(totalDuration.value))
        localStorage.setItem('forge-fit-rest-time-left', String(timeLeft.value))
        
        updateTabTitle(timeLeft.value)
    }

    const subtractTime = (rawSeconds: number | any) => {
        const seconds = unref(rawSeconds)
        if (!isResting.value || isNaN(seconds)) return
        initAudio()
        if (timeLeft.value > seconds) {
            timeLeft.value -= seconds
            totalDuration.value = Math.max(totalDuration.value - seconds, timeLeft.value)
            
            const rawStartedAt = localStorage.getItem('forge-fit-rest-started-at')
            const currentStartedAt = Number(rawStartedAt)
            const newStartedAt = isNaN(currentStartedAt) ? Date.now() + seconds * 1000 : currentStartedAt + seconds * 1000
            
            localStorage.setItem('forge-fit-rest-started-at', String(newStartedAt))
            localStorage.setItem('forge-fit-rest-total-duration', String(totalDuration.value))
            localStorage.setItem('forge-fit-rest-time-left', String(timeLeft.value))
            
            updateTabTitle(timeLeft.value)
        } else {
            // 如果減去時間會少於等於 0，直接完成休息
            timeLeft.value = 0
            playBeepSound()
            triggerVibration()
            stopRest()
        }
    }

    onUnmounted(() => {
        if (timerIntervalId) {
            clearInterval(timerIntervalId)
        }
    })

    return {
        isResting,
        timeLeft,
        totalDuration,
        activeExerciseName,
        isPaused,
        globalRestDuration,
        setGlobalRestDuration,
        loadGlobalRestDuration,
        restoreTimerState,
        startRest,
        stopRest,
        pauseRest,
        resumeRest,
        addTime,
        subtractTime
    }
})
