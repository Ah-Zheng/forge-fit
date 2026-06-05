<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWorkoutStore, useRestTimerStore } from '../../../entities/workout'
import { 
    Timer, 
    Play, 
    Pause, 
    SkipForward, 
    Plus, 
    Minus, 
    ChevronRight,
    Dumbbell,
    ClipboardList
} from '@lucide/vue'

const router = useRouter()
const workoutStore = useWorkoutStore()
const timerStore = useRestTimerStore()

const { todaySession } = storeToRefs(workoutStore)
const { isResting, timeLeft, totalDuration, activeExerciseName, isPaused } = storeToRefs(timerStore)

// 💡 格式化倒數秒數為 MM:SS
const formattedTimeLeft = computed(() => {
    const totalSeconds = timeLeft.value
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00'
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// 💡 計算 SVG 圓形進度條的 stroke-dashoffset
const strokeDashoffset = computed(() => {
    const radius = 90
    const circumference = 2 * Math.PI * radius
    const total = totalDuration.value
    const current = timeLeft.value
    if (isNaN(total) || total <= 0 || isNaN(current) || current <= 0) {
        return circumference
    }
    const progress = current / total
    return circumference * (1 - progress)
})

// 💡 今日訓練動作清單
const planExercises = computed(() => {
    return todaySession.value?.exercises || []
})

// 💡 計算某動作完成組數與總組數
const getExerciseProgress = (ex: any) => {
    const total = ex.sets?.length || 0
    const completed = ex.sets?.filter((s: any) => s.completed).length || 0
    const percent = total > 0 ? (completed / total) * 100 : 0
    return { completed, total, percent }
}

// 💡 一鍵跳轉至重量日誌並聚焦該動作
const handleFocusExercise = (exerciseId: string) => {
    // 💡 設定 Pinia store 焦點 ID
    (workoutStore as any).activeExerciseFocusId = exerciseId
    
    // 跳轉至日誌
    router.push({
        path: '/logger',
        query: { focus: exerciseId }
    })
}

// 💡 手機版/快捷手動啟動休息
const handleQuickStartRest = (seconds: number) => {
    timerStore.startRest(seconds, '手動休息')
}

// 💡 快捷切換組數完成狀態，並自動觸發休息計時器
const handleToggleSet = (ex: any, set: any) => {
    if (todaySession.value?.completed) return
    set.completed = !set.completed
    if (set.completed) {
        timerStore.startRest(timerStore.globalRestDuration, ex.name)
    }
}

// 💡 判斷是否為建議進行的下一組 (引導光圈)
const isNextSuggestSet = (ex: any, sIdx: number) => {
    if (ex.sets[sIdx].completed) return false
    if (sIdx === 0) return true
    return ex.sets[sIdx - 1].completed
}
</script>

<template>
    <div class="plan-page-wrapper" style="animation: fadeInUp 0.4s ease forwards">
        
        <!-- 💡 區塊一：組間休息控制台 (計時器) -->
        <div class="timer-console-card glass-card">
            <div class="card-header">
                <Timer :size="18" class="text-warning glow-warn" />
                <h2>組間休息倒數</h2>
                <span v-if="isResting" class="status-badge pulse-orange">RESTING</span>
                <span v-else class="status-badge status-idle">IDLE</span>
            </div>

            <!-- 計時器主體：倒數中 -->
            <div v-if="isResting" class="timer-active-view">
                <div class="timer-target-name">
                    正在為 <span>{{ activeExerciseName }}</span> 休息中
                </div>

                <!-- 圓形倒數 SVG -->
                <div class="circular-timer-wrapper">
                    <svg class="circular-timer-svg" viewBox="0 0 200 200">
                        <!-- 底環 -->
                        <circle class="timer-track" cx="100" cy="100" r="90" />
                        <!-- 倒數環 -->
                        <circle 
                            class="timer-progress" 
                            cx="100" 
                            cy="100" 
                            r="90"
                            :style="{ strokeDashoffset: strokeDashoffset }"
                        />
                    </svg>
                    <!-- 中央文字 -->
                    <div class="timer-text-overlay" :class="{ 'text-paused': isPaused }">
                        <span class="digits">{{ formattedTimeLeft }}</span>
                        <span class="paused-hint" v-if="isPaused">PAUSED</span>
                    </div>
                </div>

                <!-- 微調與控制面板 -->
                <div class="timer-control-buttons">
                    <!-- 減少 30 秒 -->
                    <button 
                        @click="timerStore.subtractTime(30)" 
                        class="btn-icon-circle btn-adjust"
                        title="減少 30 秒"
                    >
                        <Minus :size="16" />
                        <span>-30s</span>
                    </button>

                    <!-- 暫停 / 繼續 -->
                    <button 
                        v-if="!isPaused" 
                        @click="timerStore.pauseRest" 
                        class="btn-icon-circle btn-main-control btn-pause"
                        title="暫停"
                    >
                        <Pause :size="20" />
                    </button>
                    <button 
                        v-else 
                        @click="timerStore.resumeRest" 
                        class="btn-icon-circle btn-main-control btn-play"
                        title="繼續"
                    >
                        <Play :size="20" />
                    </button>

                    <!-- 增加 30 秒 -->
                    <button 
                        @click="timerStore.addTime(30)" 
                        class="btn-icon-circle btn-adjust"
                        title="增加 30 秒"
                    >
                        <Plus :size="16" />
                        <span>+30s</span>
                    </button>
                </div>

                <!-- 跳過按鈕 -->
                <button @click="timerStore.stopRest" class="btn btn-outline-warn btn-skip">
                    <SkipForward :size="16" />
                    <span>跳過休息，開始下一組</span>
                </button>
            </div>

            <!-- 計時器主體：未在休息 (手動啟動面板) -->
            <div v-else class="timer-idle-view">
                <p class="idle-tip">做完一組後，在日誌頁面勾選「完成」即可自動觸發倒數計時。</p>
                <div class="quick-start-section">
                    <div class="quick-title">手動快速啟動</div>
                    <div class="quick-btn-grid">
                        <button @click="handleQuickStartRest(60)" class="quick-start-btn">
                            <span>1 分</span>
                        </button>
                        <button @click="handleQuickStartRest(90)" class="quick-start-btn">
                            <span>1.5 分</span>
                        </button>
                        <button @click="handleQuickStartRest(120)" class="quick-start-btn">
                            <span>2 分</span>
                        </button>
                        <button @click="handleQuickStartRest(180)" class="quick-start-btn">
                            <span>3 分</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 💡 區塊二：今日訓練計劃進度 -->
        <div class="plan-summary-card glass-card">
            <div class="card-header">
                <Dumbbell :size="18" class="text-cyan glow-cyan" />
                <h2>今日課表計劃</h2>
                <span class="exercise-count-badge">{{ planExercises.length }} 個動作</span>
            </div>

            <!-- 當天有動作 -->
            <div v-if="planExercises.length > 0" class="plan-exercises-list">
                <div 
                    v-for="(ex, idx) in planExercises" 
                    :key="ex.exerciseId" 
                    @click="handleFocusExercise(ex.exerciseId)"
                    class="plan-exercise-item"
                    style="animation: fadeIn 0.3s ease"
                    :style="{ animationDelay: `${idx * 0.05}s` }"
                >
                    <div class="ex-info-row">
                        <div class="ex-num">{{ idx + 1 }}</div>
                        <div class="ex-details">
                            <div class="ex-name">{{ ex.name }}</div>
                            <div class="ex-sets-summary">
                                共 {{ getExerciseProgress(ex).total }} 組 · 
                                已完成 {{ getExerciseProgress(ex).completed }} 組
                            </div>
                        </div>
                        <ChevronRight :size="16" class="arrow-icon" />
                    </div>

                    <!-- 進度條 -->
                    <div class="ex-progress-bar-wrapper">
                        <div 
                            class="ex-progress-fill" 
                            :class="{ 'bar-all-completed': getExerciseProgress(ex).percent === 100 }"
                            :style="{ width: `${getExerciseProgress(ex).percent}%` }"
                        ></div>
                    </div>

                    <!-- 💡 快捷組數勾選區 (點擊小圓圈直接完成組數並啟動休息計時器，極速體驗) -->
                    <div class="ex-quick-sets-row" v-if="ex.sets && ex.sets.length > 0">
                        <button 
                            v-for="(set, sIdx) in ex.sets" 
                            :key="sIdx"
                            @click.stop="handleToggleSet(ex, set)"
                            class="quick-set-btn"
                            :class="{ 
                                'completed': set.completed,
                                'suggest-glow': isNextSuggestSet(ex, sIdx) && !todaySession?.completed
                            }"
                            :disabled="todaySession?.completed"
                            :title="`${set.weight}kg × ${set.reps}下 · ${set.completed ? '已完成 (點擊取消)' : '未完成 (點擊完成)'}`"
                        >
                            <span class="set-num-text">{{ sIdx + 1 }}</span>
                            <span class="set-sub-text">{{ set.weight }}k</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 空白狀態 -->
            <div v-else class="plan-empty-view">
                <ClipboardList :size="40" class="text-muted" style="margin-bottom: 0.75rem" />
                <p class="empty-tip">今天尚未安排任何訓練計劃。</p>
                <RouterLink to="/logger" class="btn btn-primary btn-add-plan">
                    <Plus :size="16" />
                    <span>前往重量日誌新增動作</span>
                </RouterLink>
            </div>
        </div>

    </div>
</template>

<style scoped>
.plan-page-wrapper {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.glass-card {
    background: rgba(18, 22, 36, 0.45);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
}

.card-header h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
    flex: 1;
}

/* 狀態徽章 */
.status-badge {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 20px;
    letter-spacing: 0.5px;
}

.pulse-orange {
    background: rgba(255, 122, 0, 0.15);
    color: #ff7a00;
    border: 1px solid rgba(255, 122, 0, 0.3);
    animation: pulseWarn 2s infinite;
}

.status-idle {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.exercise-count-badge {
    font-size: 0.75rem;
    color: var(--color-cyan);
    font-weight: 600;
}

/* 計時器倒數中 UI */
.timer-active-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.25rem 0 0.75rem;
}

.timer-target-name {
    font-size: 0.82rem;
    color: var(--text-sub);
    margin-bottom: 1rem;
    text-align: center;
}

.timer-target-name span {
    color: #fff;
    font-weight: 700;
    border-bottom: 2px solid var(--color-cyan);
    padding-bottom: 2px;
}

/* SVG 圓環計時器 */
.circular-timer-wrapper {
    position: relative;
    width: 140px;
    height: 140px;
    margin-bottom: 1rem;
}

.circular-timer-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg); /* 從頂部開始倒數 */
}

.timer-track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.03);
    stroke-width: 8px;
}

.timer-progress {
    fill: none;
    stroke: #ff7a00;
    stroke-width: 8px;
    stroke-linecap: round;
    stroke-dasharray: 565.48; /* 2 * PI * 90 */
    transition: stroke-dashoffset 0.1s linear;
    filter: drop-shadow(0 0 6px rgba(255, 122, 0, 0.5));
}

.timer-text-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all 0.3s ease;
}

.timer-text-overlay.text-paused {
    opacity: 0.6;
}

.timer-text-overlay .digits {
    font-size: 1.85rem;
    font-weight: 800;
    font-family: monospace;
    color: #fff;
    letter-spacing: -0.5px;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

.paused-hint {
    font-size: 0.6rem;
    font-weight: 800;
    color: #ff7a00;
    letter-spacing: 1px;
    margin-top: -2px;
}

/* 計時器控制按鈕 */
.timer-control-buttons {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.btn-icon-circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-adjust {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-main);
}

.btn-adjust:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
}

.btn-adjust span {
    font-size: 0.6rem;
    font-weight: 700;
    margin-top: -1px;
}

.btn-main-control {
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-pause {
    background: #ff7a00;
    color: #fff;
    filter: drop-shadow(0 0 8px rgba(255, 122, 0, 0.4));
}

.btn-pause:hover {
    background: #ff9024;
    transform: scale(1.05);
}

.btn-play {
    background: var(--color-success);
    color: #fff;
    filter: drop-shadow(0 0 8px rgba(0, 230, 120, 0.4));
}

.btn-play:hover {
    background: #24e384;
    transform: scale(1.05);
}

.btn-skip {
    width: 100%;
    max-width: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 38px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
}

/* 計時器閒置中 UI */
.timer-idle-view {
    text-align: center;
    padding: 0.75rem 0 0.5rem;
}

.idle-tip {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    line-height: 1.4;
}

.quick-start-section {
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    padding-top: 1rem;
}

.quick-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-sub);
    margin-bottom: 0.6rem;
    text-align: left;
}

.quick-btn-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
}

.quick-start-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    color: var(--text-main);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.5rem 0;
    cursor: pointer;
    transition: all 0.2s ease;
}

.quick-start-btn:hover {
    background: rgba(255, 122, 0, 0.08);
    border-color: rgba(255, 122, 0, 0.25);
    color: #ff7a00;
    transform: translateY(-1px);
}

/* 計劃動作清單 */
.plan-exercises-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.plan-exercise-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.plan-exercise-item:hover {
    background: rgba(0, 240, 255, 0.02);
    border-color: rgba(0, 240, 255, 0.12);
}

.ex-info-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-bottom: 0.65rem;
}

.ex-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0, 240, 255, 0.08);
    border: 1px solid rgba(0, 240, 255, 0.2);
    color: var(--color-cyan);
    font-size: 0.75rem;
    font-weight: 800;
}

.ex-details {
    flex: 1;
    min-width: 0;
}

.ex-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ex-sets-summary {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
}

.arrow-icon {
    color: var(--text-muted);
    transition: transform 0.2s ease;
}

.plan-exercise-item:hover .arrow-icon {
    color: var(--color-cyan);
    transform: translateX(2px);
}

/* 進度條 */
.ex-progress-bar-wrapper {
    height: 4px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 2px;
    overflow: hidden;
}

.ex-progress-fill {
    height: 100%;
    background: var(--color-cyan);
    border-radius: 2px;
    width: 0%;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-all-completed {
    background: var(--color-success);
    filter: drop-shadow(0 0 3px rgba(0, 230, 120, 0.5));
}

/* 空白狀態 */
.plan-empty-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1rem;
    text-align: center;
}

.empty-tip {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 1.25rem;
}

.btn-add-plan {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.6rem 1.2rem;
    border-radius: 20px;
    cursor: pointer;
}

/* 動畫 */
@keyframes pulseWarn {
    0% {
        box-shadow: 0 0 0 0 rgba(255, 122, 0, 0.4);
    }
    70% {
        box-shadow: 0 0 0 6px rgba(255, 122, 0, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(255, 122, 0, 0);
    }
}

/* 💡 快捷組數按鈕列樣式 */
.ex-quick-sets-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.85rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.quick-set-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-set-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
}

.quick-set-btn:disabled {
    cursor: default;
    opacity: 0.6;
}

.set-num-text {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--text-main);
    line-height: 1.1;
}

.set-sub-text {
    font-size: 0.55rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-top: 1px;
}

/* 已完成狀態：亮綠色霓虹 */
.quick-set-btn.completed {
    background: rgba(0, 230, 120, 0.12) !important;
    border-color: var(--color-success) !important;
    box-shadow: 0 0 8px rgba(0, 230, 120, 0.2);
}

.quick-set-btn.completed .set-num-text {
    color: var(--color-success);
}

.quick-set-btn.completed .set-sub-text {
    color: rgba(0, 230, 120, 0.7);
}

/* 建議進行的下一組：青色呼吸燈引導 */
.quick-set-btn.suggest-glow {
    border-color: rgba(0, 240, 255, 0.35);
    background: rgba(0, 240, 255, 0.03);
    animation: suggestPulse 2s infinite ease-in-out;
}

.quick-set-btn.suggest-glow .set-num-text {
    color: var(--color-cyan);
    text-shadow: 0 0 4px rgba(0, 240, 255, 0.3);
}

@keyframes suggestPulse {
    0% {
        box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.25);
        border-color: rgba(0, 240, 255, 0.35);
    }
    50% {
        box-shadow: 0 0 8px 1px rgba(0, 240, 255, 0.15);
        border-color: rgba(0, 240, 255, 0.6);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.25);
        border-color: rgba(0, 240, 255, 0.35);
    }
}
</style>
