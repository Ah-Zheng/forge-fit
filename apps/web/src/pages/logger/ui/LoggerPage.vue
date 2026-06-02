<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ClipboardList, AlertCircle, Dumbbell, Trash2, Plus, Timer, Play, Pause } from 'lucide-vue-next'
/** 💡 導入共享的型別定義 */
import type { WorkoutSession, ExerciseSession } from '@forge-fit/types'
/** 💡 導入我們剛剛寫好的共享觸控步進器組件 (FSD 規範下的 shared/ui 層) */
import { TactileStepper } from '../../../shared/ui/stepper'
/** 💡 導入輕量級 Canvas 霓虹發光粒子雨引擎 */
import { NeonConfetti } from '../../../shared/lib/confetti'

/** 💡 宣告接收來自 App.vue 的 Props */
const props = defineProps<{
    session: WorkoutSession
}>()

/** 今日已累積鍛鍊的基準總秒數（截至上一次暫停為止） */
const secondsElapsed = ref(0)

/** 💡 用於顯示與保存的當前動態秒數（包含基準秒數與當前跑秒差值） */
const liveSeconds = ref(0)

/** 運動秒錶計時器是否處於跑秒運行狀態 */
const isTimerActive = ref(true)

/** JavaScript 原生 setInterval 計時器 ID */
let timerIntervalId: number | null = null

/**
 * 刪除整組運動動作的處理邏輯
 */
const handleDeleteExercise = (index: number) => {
    if (confirm('確定要移除此動作與所有組數紀錄嗎？')) {
        // 透過直接突變陣列，App.vue 中的 deep watch 會立即感知並自動存檔 LocalStorage！
        props.session.exercises.splice(index, 1)
    }
}

/**
 * 刪除單一組數的處理邏輯
 */
const handleDeleteSet = (exercise: ExerciseSession, setIdx: number) => {
    exercise.sets.splice(setIdx, 1)
}

/**
 * ⚡ 智慧組數記憶 (Smart Set Copier) 邏輯
 * 新增組數時，自動複製上一組的重量與次數，免去手動重複調整的麻煩。
 */
const handleAddSet = (exercise: ExerciseSession) => {
    const setsCount = exercise.sets.length
    let defaultWeight = 40
    let defaultReps = 10

    if (setsCount > 0) {
        // 讀取最後一組的數據作為預設模板值
        const lastSet = exercise.sets[setsCount - 1]
        defaultWeight = lastSet.weight
        defaultReps = lastSet.reps
    }

    // 往組數清單中推進新的一組，並預設勾選為未完成狀態
    exercise.sets.push({
        weight: defaultWeight,
        reps: defaultReps,
        completed: false
    })
}

/**
 * 輔助函式：轉換肌群代號為繁體中文標籤樣式
 */
const getMuscleTagClass = (muscle: string) => {
    switch (muscle) {
        case 'chest':
            return 'tag-chest'
        case 'back':
            return 'tag-back'
        case 'legs':
            return 'tag-legs'
        case 'shoulders':
            return 'tag-shoulders'
        case 'arms':
            return 'tag-arms'
        default:
            return 'tag-chest'
    }
}

/**
 * 輔助函式：獲取肌群繁體中文翻譯
 */
const getMuscleNameZh = (muscle: string) => {
    switch (muscle) {
        case 'chest':
            return '胸部'
        case 'back':
            return '背部'
        case 'legs':
            return '腿部'
        case 'shoulders':
            return '肩膀'
        case 'arms':
            return '手臂'
        default:
            return '全身'
    }
}

/** 💡 宣告 Canvas 粒子雨發射器 Ref 與實例 */
const confettiCanvas = ref<HTMLCanvasElement | null>(null)
let confettiEngine: NeonConfetti | null = null

/**
 * ⚡ 時間戳動態同步方法：計算從開始跑秒至今的差值，一次性補償背景時間 (如切換到桌面、螢幕睡眠)
 */
const syncLiveTime = () => {
    if (isTimerActive.value && props.session.timerStartedAt) {
        const diff = Math.floor((Date.now() - props.session.timerStartedAt) / 1000)
        liveSeconds.value = secondsElapsed.value + diff
    } else {
        liveSeconds.value = secondsElapsed.value
    }
    updateSessionDuration()
}

/**
 * 核心方法：微秒級將當前秒數轉換為分鐘數，同步更新回資料庫結構中
 */
const updateSessionDuration = () => {
    props.session.duration = Math.round(liveSeconds.value / 60)
    props.session.secondsElapsed = liveSeconds.value
    props.session.isTimerActive = isTimerActive.value
}

/**
 * 啟動運動計時秒錶 (自動跑秒)
 */
const startTimer = () => {
    if (timerIntervalId) return
    isTimerActive.value = true
    props.session.isTimerActive = true
    
    // 💡 如果之前沒有基準開始時間戳，就設定為當下
    if (!props.session.timerStartedAt) {
        props.session.timerStartedAt = Date.now()
    }
    
    syncLiveTime()
    
    timerIntervalId = window.setInterval(() => {
        syncLiveTime()
    }, 1000)
}

/**
 * 暫停運動計時秒錶
 */
const pauseTimer = () => {
    if (timerIntervalId) {
        window.clearInterval(timerIntervalId)
        timerIntervalId = null
    }
    
    // 💡 將當前正在跑秒的差值正式收割、累加到基準秒數 secondsElapsed 中
    if (isTimerActive.value && props.session.timerStartedAt) {
        const diff = Math.floor((Date.now() - props.session.timerStartedAt) / 1000)
        secondsElapsed.value += diff
    }
    
    isTimerActive.value = false
    props.session.isTimerActive = false
    props.session.timerStartedAt = undefined
    
    liveSeconds.value = secondsElapsed.value
    updateSessionDuration()
}

/**
 * 快捷微調運動時長 (例如加減 5 分鐘)
 * @param minutes 調整的分鐘差值 (如 -5 或 5)
 */
const adjustDuration = (minutes: number) => {
    const newSeconds = secondsElapsed.value + minutes * 60
    secondsElapsed.value = Math.max(0, newSeconds)
    syncLiveTime()
}

/** 💡 格式化已耗費時長為 hh:mm:ss 霓虹跑秒字串 */
const formattedDuration = computed(() => {
    const hrs = Math.floor(liveSeconds.value / 3600)
    const mins = Math.floor((liveSeconds.value % 3600) / 60)
    const secs = liveSeconds.value % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// 💡 監聽網頁前台/背景切換事件，當切回前台時，一瞬間補償在背景(如桌面、關閉螢幕)度過的時間差
const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
        syncLiveTime()
    }
}

onMounted(() => {
    if (confettiCanvas.value) {
        confettiEngine = new NeonConfetti(confettiCanvas.value)
    }

    // 💡 優先從今日已保存的 session 中還原基準時長，並利用純數學公式反推還原 secondsElapsed
    if (typeof props.session.secondsElapsed === 'number') {
        const savedSeconds = props.session.secondsElapsed
        const wasActive = props.session.isTimerActive !== undefined ? props.session.isTimerActive : true
        
        if (wasActive && props.session.timerStartedAt) {
            const diff = Math.floor((Date.now() - props.session.timerStartedAt) / 1000)
            secondsElapsed.value = Math.max(0, savedSeconds - diff)
        } else {
            secondsElapsed.value = savedSeconds
            props.session.timerStartedAt = undefined
        }
    } else {
        secondsElapsed.value = (props.session.duration || 0) * 60
    }

    // 💡 監聽行動端切桌面、關螢幕的 Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 💡 載入先前切換頁面時的播放狀態，若為今天的重訓且切換前 active 則啟動
    const todayStr = new Date().toISOString().split('T')[0]
    if (props.session.date === todayStr) {
        const wasActive = props.session.isTimerActive !== undefined ? props.session.isTimerActive : true
        if (wasActive) {
            startTimer()
        } else {
            isTimerActive.value = false
            syncLiveTime()
        }
    } else {
        isTimerActive.value = false
        syncLiveTime()
    }
})

onUnmounted(() => {
    if (confettiEngine) {
        confettiEngine.destroy()
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    pauseTimer()
})

/** ⚡ 響應式計算：本日日誌是否全部組數皆已勾選完成 */
const isAllCompleted = computed(() => {
    const exercises = props.session.exercises
    if (exercises.length === 0) return false

    const hasSets = exercises.some(ex => ex.sets.length > 0)
    if (!hasSets) return false

    return exercises.every(ex => ex.sets.length > 0 && ex.sets.every(s => s.completed))
})

/** 💡 深度監聽完成狀態，並在全數勾選完成的那一秒，噴灑悍將榮耀的霓虹粒子雨！ */
watch(isAllCompleted, newVal => {
    if (newVal && confettiEngine) {
        confettiEngine.burst(80)
    }
})

/** 💡 深度監聽日期變動，當使用者在頂部切換日期時，完美重置秒錶與其餘狀態 */
watch(() => props.session.date, (newDate) => {
    pauseTimer()
    // 重新校正對應日期的已儲存時長
    if (typeof props.session.secondsElapsed === 'number') {
        const savedSeconds = props.session.secondsElapsed
        const wasActive = props.session.isTimerActive !== undefined ? props.session.isTimerActive : true
        
        if (wasActive && props.session.timerStartedAt) {
            const diff = Math.floor((Date.now() - props.session.timerStartedAt) / 1000)
            secondsElapsed.value = Math.max(0, savedSeconds - diff)
        } else {
            secondsElapsed.value = savedSeconds
            props.session.timerStartedAt = undefined
        }
    } else {
        secondsElapsed.value = (props.session.duration || 0) * 60
    }
    
    // 僅在切換回「今天」時自動跑秒（或根據已記錄的狀態）；補記歷史日誌則預設維持暫停狀態
    const todayStr = new Date().toISOString().split('T')[0]
    if (newDate === todayStr) {
        const wasActive = props.session.isTimerActive !== undefined ? props.session.isTimerActive : true
        if (wasActive) {
            startTimer()
        } else {
            isTimerActive.value = false
            syncLiveTime()
        }
    } else {
        isTimerActive.value = false
        syncLiveTime()
    }
})
</script>

<template>
    <div class="glass-card" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 頁頭 -->
        <div class="card-header">
            <div class="card-title-group">
                <ClipboardList
                    class="text-cyan"
                    :size="24"
                    style="filter: drop-shadow(0 0 4px var(--color-cyan))"
                />
                <h2>本日重量日誌</h2>
            </div>
            <span class="workout-status-badge">鍛鍊中</span>
        </div>

        <!-- 💡 區塊 1.8：毛玻璃科技風時長主控條 (Glassmorphic Timer Bar) -->
        <div class="timer-control-bar glass-card" style="margin-top: 1rem; animation: fadeIn 0.3s ease">
            <div class="timer-left-group">
                <div class="timer-icon-container" :class="{ 'timer-spinning': isTimerActive }">
                    <Timer :size="18" class="text-cyan" style="filter: drop-shadow(0 0 3px var(--color-cyan))" />
                </div>
                <div class="timer-label-group">
                    <span class="timer-title">本日鍛鍊時長</span>
                    <span class="timer-countdown">{{ formattedDuration }}</span>
                </div>
            </div>
            
            <div class="timer-actions-group">
                <!-- 暫停 / 開始按鈕 -->
                <button 
                    v-if="isTimerActive" 
                    @click="pauseTimer" 
                    class="btn-timer btn-timer-pause" 
                    title="暫停計時"
                >
                    <Pause :size="14" />
                    <span>暫停</span>
                </button>
                <button 
                    v-else 
                    @click="startTimer" 
                    class="btn-timer btn-timer-play" 
                    title="開始計時"
                >
                    <Play :size="14" />
                    <span>開始</span>
                </button>
                
                <!-- 手動微調時長按鈕 (以 5 分鐘為單位) -->
                <div class="timer-stepper-group">
                    <button @click="adjustDuration(-5)" class="btn-timer-step" title="減少 5 分鐘">-5m</button>
                    <button @click="adjustDuration(5)" class="btn-timer-step" title="增加 5 分鐘">+5m</button>
                </div>
            </div>
        </div>

        <!-- 💡 場景 1：本日無紀錄時的空狀態引導 -->
        <div
            v-if="props.session.exercises.length === 0"
            class="empty-state-container"
            style="text-align: center; padding: 4rem 1rem"
        >
            <AlertCircle
                class="text-cyan"
                :size="48"
                style="
                    margin: 0 auto 1.25rem auto;
                    opacity: 0.8;
                    filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.3));
                "
            />
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem">
                今天尚未安排任何動作
            </h3>
            <p
                style="
                    color: var(--text-sub);
                    font-size: 0.92rem;
                    max-width: 320px;
                    margin: 0 auto;
                    line-height: 1.6;
                "
            >
                請切換至下方 **「百科」** 分頁，點擊動作右側的 **`+`
                按鈕**，即可將常用器材一鍵加入今日重訓日誌！
            </p>
        </div>

        <!-- 💡 場景 2：動態渲染真正的重訓動作日誌卡片與觸控加減按鈕 -->
        <div v-else class="exercises-container" style="margin-top: 1.5rem">
            <div
                v-for="(ex, exIdx) in props.session.exercises"
                :key="ex.exerciseId"
                class="exercise-block card-glow-blue"
                :class="{
                    'exercise-all-completed': ex.sets.length > 0 && ex.sets.every(s => s.completed)
                }"
                style="margin-bottom: 1.5rem; animation: fadeInUp 0.3s ease forwards"
            >
                <!-- 動作卡片頭部資訊 (包含刪除按鈕) -->
                <div class="exercise-header">
                    <div class="exercise-title-area">
                        <div class="exercise-icon">
                            <Dumbbell :size="16" class="text-cyan" />
                        </div>
                        <div>
                            <h3 class="exercise-name">{{ ex.name }}</h3>
                            <span
                                class="badge"
                                :class="getMuscleTagClass(ex.muscle)"
                                style="margin-top: 0.25rem"
                            >
                                {{ getMuscleNameZh(ex.muscle) }} ({{ ex.muscle.toUpperCase() }})
                            </span>
                        </div>
                    </div>
                    <!-- 刪除動作按鈕 -->
                    <button
                        class="btn-icon"
                        @click="handleDeleteExercise(exIdx)"
                        title="移除此動作"
                        style="color: var(--text-muted)"
                    >
                        <Trash2 :size="18" />
                    </button>
                </div>

                <!-- 組數紀錄表格區塊 -->
                <div class="set-rows-container" style="margin-top: 1rem">
                    <!-- 表格表頭 -->
                    <div class="set-header-row">
                        <span class="col-num" style="text-align: center">組次</span>
                        <span class="col-weight" style="text-align: center">重量 (kg)</span>
                        <span class="col-reps" style="text-align: center">次數 (reps)</span>
                        <span class="col-status" style="text-align: center">完成</span>
                        <span class="col-delete" style="text-align: center"></span>
                    </div>

                    <!-- 💡 響應式組數迴圈渲染：綁定我們的客製化觸控加減步進器 -->
                    <div
                        v-for="(set, setIdx) in ex.sets"
                        :key="setIdx"
                        class="set-row"
                        :class="{ 'active-row': set.completed }"
                        style="animation: fadeInUp 0.2s ease forwards"
                    >
                        <!-- 組次編號 -->
                        <span class="set-num">{{ setIdx + 1 }}</span>

                        <!-- 🏋️‍♂️ 重量步進器：每點一下加減 2.5 kg -->
                        <TactileStepper v-model="set.weight" :step="2.5" />

                        <!-- 🔢 次數步進器：每點一下加減 1 下 -->
                        <TactileStepper v-model="set.reps" :step="1" />

                        <!-- 核取狀態 Checkbox -->
                        <label class="checkbox-container">
                            <input type="checkbox" v-model="set.completed" />
                            <span class="checkmark"></span>
                        </label>

                        <!-- 🗑️ 刪除單組按鈕 -->
                        <button
                            type="button"
                            class="btn-icon delete-set-btn"
                            @click="handleDeleteSet(ex, setIdx)"
                            title="刪除此組"
                            style="
                                color: var(--text-muted);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 100%;
                                height: 100%;
                                cursor: pointer;
                            "
                        >
                            <Trash2 :size="14" />
                        </button>
                    </div>
                </div>

                <!-- 新增組數按鈕 (智慧組數記憶) -->
                <button
                    class="btn btn-secondary btn-sm"
                    @click="handleAddSet(ex)"
                    style="
                        margin-top: 0.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.25rem;
                    "
                >
                    <Plus :size="14" /> 新增組數
                </button>
            </div>
        </div>

        <!-- 💡 霓虹粒子雨 Canvas (高寬隨 Card 自動拉滿，層級最高但穿透) -->
        <canvas ref="confettiCanvas" class="logger-confetti-canvas"></canvas>
    </div>
</template>

<style scoped>
/* 頁面內部微調微排版，大部分沿用全域 style.css 的變數定義 */
pre {
    white-space: pre-wrap;
    word-wrap: break-word;
}

/* 🗑️ 刪除組數按鈕的滑鼠懸停微發光紅色效果 */
.delete-set-btn {
    transition: var(--transition);
}
.delete-set-btn:hover {
    color: var(--color-danger) !important;
    filter: drop-shadow(0 0 4px var(--color-danger));
    transform: scale(1.1);
}
.delete-set-btn:active {
    transform: scale(0.9);
}

/* 💡 霓虹粒子雨畫布覆蓋 */
.logger-confetti-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999;
}

/* 💡 當單一組數完成時，整行亮起代表完成的極光青霓虹發光背景與呼吸效果 */
.set-row {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
}

.set-row.active-row {
    background: rgba(0, 240, 255, 0.03) !important;
    border-color: rgba(0, 240, 255, 0.15) !important;
    box-shadow: inset 0 0 8px rgba(0, 240, 255, 0.05);
}

/* 💡 當動作卡片內所有組數皆完成時，卡片外框亮起科技皇家藍霓虹發光呼吸燈 */
.exercise-block {
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 1.25rem;
    background: rgba(18, 22, 36, 0.4);
}

.exercise-block.exercise-all-completed {
    border-color: rgba(47, 128, 237, 0.35) !important;
    box-shadow: 0 0 16px rgba(47, 128, 237, 0.12);
}

/* 💡 毛玻璃科技風時長主控條樣式 */
.timer-control-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    background: rgba(255, 255, 255, 0.01) !important;
    border: 1px dashed rgba(0, 240, 255, 0.15) !important;
    border-radius: 10px;
    gap: 1rem;
    box-shadow: inset 0 0 10px rgba(0, 240, 255, 0.01) !important;
}

.timer-left-group {
    display: flex;
    align-items: center;
    gap: 0.85rem;
}

.timer-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(0, 240, 255, 0.05);
    border: 1px solid rgba(0, 240, 255, 0.1);
    transition: all 0.35s ease;
}

/* 秒錶旋轉動畫 */
.timer-spinning {
    animation: pulseSpin 3s linear infinite;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
    border-color: rgba(0, 240, 255, 0.3);
}

@keyframes pulseSpin {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.08); }
    100% { transform: rotate(360deg) scale(1); }
}

.timer-label-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.timer-title {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.timer-countdown {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-cyan);
    font-family: 'Outfit', 'Inter', monospace;
    letter-spacing: 0.05em;
    text-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
}

.timer-actions-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.btn-timer {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.85rem;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-timer-pause {
    background: rgba(255, 74, 74, 0.08) !important;
    border: 1px solid rgba(255, 74, 74, 0.2) !important;
    color: var(--color-danger) !important;
}

.btn-timer-pause:hover {
    background: var(--color-danger) !important;
    color: #FFF !important;
    box-shadow: 0 0 10px rgba(255, 74, 74, 0.25);
    transform: translateY(-1px);
}

.btn-timer-play {
    background: rgba(0, 240, 255, 0.08) !important;
    border: 1px solid rgba(0, 240, 255, 0.2) !important;
    color: var(--color-cyan) !important;
}

.btn-timer-play:hover {
    background: var(--color-cyan) !important;
    color: #121624 !important;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
    transform: translateY(-1px);
}

.btn-timer:active, .btn-timer-step:active {
    transform: scale(0.95);
}

.timer-stepper-group {
    display: flex;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 2px;
}

.btn-timer-step {
    padding: 0.35rem 0.65rem;
    border-radius: 18px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-sub);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-timer-step:hover {
    color: #FFF;
    background: rgba(255, 255, 255, 0.04);
}

@media (max-width: 576px) {
    /* 💡 手機版時長控制條變為垂直排列，體驗更佳 */
    .timer-control-bar {
        flex-direction: column;
        align-items: stretch;
        padding: 0.85rem 1rem;
        gap: 0.85rem;
    }
    
    .timer-left-group {
        justify-content: space-between;
    }
    
    .timer-actions-group {
        justify-content: space-between;
        width: 100%;
    }
    
    .btn-timer {
        flex: 1;
        justify-content: center;
    }
    
    .timer-stepper-group {
        flex: 1;
    }
    
    .btn-timer-step {
        flex: 1;
        text-align: center;
    }
}
</style>
