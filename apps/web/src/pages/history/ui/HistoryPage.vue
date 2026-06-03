<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { 
    CalendarDays, 
    ChevronLeft, 
    ChevronRight, 
    Dumbbell, 
    Clock, 
    Flame, 
    CheckCircle2, 
    Copy, 
    Sparkles,
    CalendarClock,
    PlusCircle
} from '@lucide/vue'
/** 💡 導入共享的核心資料庫 API */
import { getAllWorkouts } from '@forge-fit/core'
/** 💡 導入共享型別定義 */
import type { WorkoutSession, ExerciseSession } from '@forge-fit/types'
import { useDialogStore } from '../../../shared/ui/dialog/dialogStore'

const dialogStore = useDialogStore()

// 💡 宣告接收來自 App.vue 的 Props 與 Emits
const props = defineProps<{
    session: WorkoutSession // 今日 session 引用，用於複製模板時突變數據
}>()

const emit = defineEmits<{
    (e: 'switchTab', tab: string, date?: string): void
}>()

// 1. 歷史資料狀態與日曆邏輯
const workoutsList = ref<WorkoutSession[]>([])
const selectedDateStr = ref<string>('')

// 當前日曆顯示的年月
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth()) // 0-11

// 月份中文字串
const monthNamesZh = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

// 載入歷史日誌並預設選取最近有重訓紀錄的一天
const loadHistoryData = () => {
    workoutsList.value = getAllWorkouts()
    
    // 預設選取：今天；若今天沒紀錄，則預設選取歷史最近有重訓紀錄的一天；再沒有就預設今天
    const todayStr = new Date().toISOString().split('T')[0]
    const hasToday = workoutsList.value.some(w => w.date === todayStr)
    
    if (hasToday) {
        selectedDateStr.value = todayStr
    } else if (workoutsList.value.length > 0) {
        selectedDateStr.value = workoutsList.value[0].date
        // 自動同步日曆月份到選取的日期
        const selDate = new Date(selectedDateStr.value)
        currentYear.value = selDate.getFullYear()
        currentMonth.value = selDate.getMonth()
    } else {
        selectedDateStr.value = todayStr
    }
}

onMounted(() => {
    loadHistoryData()
})

// 💡 健檢同步優化：當 KeepAlive 快取組件被重新切換顯示時，瞬間重新讀取最新 LocalStorage 資料，達成 100% 資料即時響應！
onActivated(() => {
    loadHistoryData()
})

// ⚡ 快速將有重訓紀錄的日期轉換為 Set，加速日曆格子的查詢渲染 (O(1) 效能極限)
const completedDatesSet = computed(() => {
    return new Set(workoutsList.value.map(w => w.date))
})

// 當前選定日期的重訓日誌明細
const selectedSession = computed<WorkoutSession | null>(() => {
    if (!selectedDateStr.value) return null
    // 優先從 workouts 歷史清單中尋找
    const found = workoutsList.value.find(w => w.date === selectedDateStr.value)
    if (found) return found
    
    // 若歷史沒有（代表這天是空紀錄/休息日），返回空 session 結構
    return {
        date: selectedDateStr.value,
        exercises: [],
        duration: 0
    }
})

// ⚡ 歷史日誌明細統計計算
const selectedStats = computed(() => {
    const session = selectedSession.value
    if (!session || session.exercises.length === 0) {
        return { totalVolume: 0, completedSets: 0, secondsElapsed: 0 }
    }
    
    let totalVolume = 0
    let completedSets = 0
    
    session.exercises.forEach(ex => {
        ex.sets.forEach(s => {
            if (s.completed) {
                totalVolume += s.weight * s.reps
                completedSets++
            }
        })
    })
    
    // 💡 健檢優化：優先使用高精度 secondsElapsed (秒級計時)，防範分鐘四捨五入落差；無則以 duration 分鐘乘以 60 秒作為相容後備
    const secondsElapsed = typeof session.secondsElapsed === 'number'
        ? session.secondsElapsed
        : (session.duration || 0) * 60
    
    return {
        totalVolume,
        completedSets,
        secondsElapsed
    }
})

// 2. 霓虹日曆格點生成演算法
const calendarDays = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value
    
    // 該月份的第一天是星期幾
    const firstDayIndex = new Date(year, month, 1).getDay()
    // 該月份總共有幾天
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    // 上個月份的總天數 (用於補齊前置空格)
    const prevMonthTotalDays = new Date(year, month, 0).getDate()
    
    const days: Array<{
        dateStr: string
        dayNum: number
        isCurrentMonth: boolean
        isToday: boolean
        hasWorkout: boolean
    }> = []
    
    const todayStr = new Date().toISOString().split('T')[0]
    
    // A. 補齊前置上個月的尾巴
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const d = prevMonthTotalDays - i
        const prevMonth = month === 0 ? 11 : month - 1
        const prevYear = month === 0 ? year - 1 : year
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({
            dateStr,
            dayNum: d,
            isCurrentMonth: false,
            isToday: dateStr === todayStr,
            hasWorkout: completedDatesSet.value.has(dateStr)
        })
    }
    
    // B. 填入本月所有日子
    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({
            dateStr,
            dayNum: d,
            isCurrentMonth: true,
            isToday: dateStr === todayStr,
            hasWorkout: completedDatesSet.value.has(dateStr)
        })
    }
    
    // C. 補齊後置下個月的開頭 (拉滿 6 列共 42 格，維持格點高度絕對一致)
    const remainingGrids = 42 - days.length
    for (let d = 1; d <= remainingGrids; d++) {
        const nextMonth = month === 11 ? 0 : month + 1
        const nextYear = month === 11 ? year + 1 : year
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({
            dateStr,
            dayNum: d,
            isCurrentMonth: false,
            isToday: dateStr === todayStr,
            hasWorkout: completedDatesSet.value.has(dateStr)
        })
    }
    
    return days
})

// 月份切換導航
const prevMonth = () => {
    if (currentMonth.value === 0) {
        currentMonth.value = 11
        currentYear.value--
    } else {
        currentMonth.value--
    }
}

const nextMonth = () => {
    if (currentMonth.value === 11) {
        currentMonth.value = 0
        currentYear.value++
    } else {
        currentMonth.value++
    }
}

// 選擇某個日子
const selectDate = (dateStr: string) => {
    selectedDateStr.value = dateStr
}

// 3. 🏋️‍♂️ 殺手級痛點解決功能：「一鍵複製為今日課表範本」
const applyAsTodayTemplate = async () => {
    const session = selectedSession.value
    if (!session || session.exercises.length === 0) return
    
    const confirmApply = await dialogStore.confirm(
        `這會將您今天尚未完成的課表覆蓋，但會複製當時設定的重量與組數模板喔！\n\n確定要把 [${session.date}] 鍛鍊的 ${session.exercises.length} 個動作，一鍵套用為今天的課表嗎？`,
        '套用課表範本',
        { type: 'warning', confirmText: '套用課表', cancelText: '取消' }
    )

    if (confirmApply) {
        // 💡 執行深拷貝複製動作與組數結構，重置完成狀態為未完成 (completed = false)
        const copiedExercises: ExerciseSession[] = JSON.parse(JSON.stringify(session.exercises))
        copiedExercises.forEach(ex => {
            ex.sets.forEach(set => {
                set.completed = false // 重置勾選狀態，供今天重新挑戰！
            })
        })
        
        // 💡 突變今日 session 數據，這會自動觸發 App.vue 的 deep watch 進行 LocalStorage 保存！
        props.session.exercises = copiedExercises
        
        await dialogStore.alert('已為您複製常用重量與組數設定。', '課表套用成功', { type: 'success' })
        // 導航跳轉回今日重量紀錄 Logger 分頁
        emit('switchTab', 'logger')
    }
}

// 4. 補記歷史日誌入口
const recordSelectedDate = () => {
    if (!selectedDateStr.value) return
    
    // 💡 智慧分流導航體驗 (Smart Redirect UX)
    // 如果該歷史日期是一篇空白紀錄，我們智慧引導使用者直接跳轉至「常用百科 (Library)」去挑選動作！
    // 如果已經有紀錄，則直接跳轉到「重量日誌 (Logger)」方便修改數值！
    const hasExercises = selectedSession.value && selectedSession.value.exercises.length > 0
    const targetTab = hasExercises ? 'logger' : 'library'
    
    emit('switchTab', targetTab, selectedDateStr.value)
}

// 輔助函式：肌群繁體中文翻譯
const getMuscleNameZh = (muscle: string) => {
    switch (muscle) {
        case 'chest': return '胸部'
        case 'back': return '背部'
        case 'legs': return '腿部'
        case 'shoulders': return '肩膀'
        case 'arms': return '手臂'
        default: return '全身'
    }
}

// 輔助格式化時間為跑錶 hh:mm:ss 或 mm:ss
const formatStopwatch = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hrs > 0) {
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
</script>

<template>
    <div class="history-grid" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 📅 左側面板：發光霓虹日曆 -->
        <div class="calendar-wrapper-card">
            <div class="card-header calendar-nav">
                <button @click="prevMonth" class="btn-icon" title="上個月">
                    <ChevronLeft :size="20" />
                </button>
                <div class="calendar-title">
                    <CalendarDays class="text-cyan" :size="18" />
                    <span>{{ currentYear }} 年 {{ monthNamesZh[currentMonth] }}</span>
                </div>
                <button @click="nextMonth" class="btn-icon" title="下個月">
                    <ChevronRight :size="20" />
                </button>
            </div>

            <!-- 星期表頭 -->
            <div class="calendar-weekdays">
                <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
            </div>

            <!-- 日曆格點網格 -->
            <div class="calendar-grid">
                <button 
                    v-for="day in calendarDays" 
                    :key="day.dateStr"
                    @click="selectDate(day.dateStr)"
                    class="calendar-day-btn"
                    :class="{
                        'outside-month': !day.isCurrentMonth,
                        'is-today': day.isToday,
                        'is-selected': day.dateStr === selectedDateStr,
                        'has-workout': day.hasWorkout
                    }"
                >
                    <span class="day-number">{{ day.dayNum }}</span>
                    <!-- 💡 發光霓虹指示點：當天有重訓紀錄時亮起呼吸極光青 -->
                    <span v-if="day.hasWorkout" class="workout-dot-glow"></span>
                </button>
            </div>

            <div class="calendar-footer-legend">
                <span class="legend-item">
                    <span class="dot-sample"></span> 有訓練紀錄的日期
                </span>
            </div>
        </div>

        <!-- 📝 右側面板：歷史日誌詳細內容 -->
        <div class="detail-wrapper-area">
            <!-- 場景 1. 選定的日子有訓練日誌 -->
            <template v-if="selectedSession && selectedSession.exercises.length > 0">
                <div class="card-header detail-header">
                    <div class="card-title-group">
                        <CalendarClock class="text-cyan" :size="22" />
                        <h2>{{ selectedDateStr }} 訓練明細</h2>
                    </div>
                    <!-- 一鍵複製模板按鈕 -->
                    <button 
                        @click="applyAsTodayTemplate" 
                        class="btn btn-secondary btn-sm flex-btn"
                        title="將當天訓練安排複製為今日課表"
                    >
                        <Copy :size="14" />
                        <span>套用為今日課表</span>
                    </button>
                </div>

                <!-- 三大負荷統計指標 -->
                <div class="history-stats-bar">
                    <div class="h-stat-item cyan-glow">
                        <div class="h-stat-icon"><Flame :size="15" /></div>
                        <div class="h-stat-info">
                            <span class="h-stat-num">{{ selectedStats.totalVolume.toLocaleString() }} <span class="h-unit">kg</span></span>
                            <span class="h-stat-label">當日總訓練量</span>
                        </div>
                    </div>
                    <div class="h-stat-item blue-glow">
                        <div class="h-stat-icon"><CheckCircle2 :size="15" /></div>
                        <div class="h-stat-info">
                            <span class="h-stat-num">{{ selectedStats.completedSets }} <span class="h-unit">組</span></span>
                            <span class="h-stat-label">累計完成組數</span>
                        </div>
                    </div>
                    <div class="h-stat-item purple-glow">
                        <div class="h-stat-icon"><Clock :size="15" /></div>
                        <div class="h-stat-info">
                            <span class="h-stat-num">{{ formatStopwatch(selectedStats.secondsElapsed) }}</span>
                            <span class="h-stat-label">鍛鍊運動時長</span>
                        </div>
                    </div>
                </div>

                <!-- 歷史動作清單 -->
                <div class="history-exercises-list">
                    <div 
                        v-for="ex in selectedSession.exercises" 
                        :key="ex.exerciseId" 
                        class="h-exercise-block"
                    >
                        <div class="h-ex-header">
                            <div class="h-ex-title">
                                <Dumbbell :size="14" class="text-cyan" />
                                <h3>{{ ex.name }}</h3>
                            </div>
                            <span class="badge tag-muscle">{{ getMuscleNameZh(ex.muscle) }}</span>
                        </div>
                        
                        <!-- 組數清單明細 (大字簡潔呈現) -->
                        <div class="h-sets-table">
                            <div 
                                v-for="(set, sIdx) in ex.sets" 
                                :key="sIdx" 
                                class="h-set-pill"
                                :class="{ 'h-set-completed': set.completed }"
                            >
                                <span class="h-set-idx">#{{ sIdx + 1 }}</span>
                                <span class="h-set-weight">{{ set.weight }} kg</span>
                                <span class="h-set-times">×</span>
                                <span class="h-set-reps">{{ set.reps }} 下</span>
                                <span v-if="set.completed" class="h-set-badge">✓</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- 場景 2. 選定的日子為空紀錄 / 休息日 -->
            <template v-else>
                <div class="empty-detail-container">
                    <div class="empty-spark-glow">
                        <Sparkles class="text-cyan glow-svg" :size="38" />
                    </div>
                    <h3>{{ selectedDateStr }}</h3>
                    <p class="rest-title">這天是個充實的休息日 🔋</p>
                    <p class="rest-desc">
                        讓肌肉在休息中修復與成長，也是漸進性超負荷中不可或缺的黃金環節。給努力訓練的自己鼓鼓掌！
                    </p>
                    
                    <!-- 補記按鈕 -->
                    <button 
                        @click="recordSelectedDate" 
                        class="btn btn-primary btn-sm flex-btn"
                        style="margin-top: 1.5rem;"
                    >
                        <PlusCircle :size="14" />
                        <span>補記這天的重量日誌</span>
                    </button>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* 📅 響應式日曆網格佈局 */
.history-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
    width: 100%;
}

.calendar-wrapper-card {
    background: var(--bg-card);
    backdrop-filter: blur(16px);
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: var(--shadow-card);
    transition: var(--transition);
}

.calendar-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 0.85rem;
    margin-bottom: 1rem;
}

.calendar-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 800;
    color: #FFF;
    font-family: 'Outfit', 'Inter', sans-serif;
}

.calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
}

.calendar-day-btn {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.04);
    color: var(--text-main);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Outfit', 'Inter', sans-serif;
}

.calendar-day-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(0, 240, 255, 0.2);
    transform: translateY(-1px);
}

.calendar-day-btn.outside-month {
    opacity: 0.25;
    font-weight: 500;
}

.calendar-day-btn.is-today {
    border-color: rgba(255, 255, 255, 0.25) !important;
    background: rgba(255, 255, 255, 0.03);
}

.calendar-day-btn.is-selected {
    background: rgba(0, 240, 255, 0.08) !important;
    border-color: var(--color-cyan) !important;
    color: var(--color-cyan) !important;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
}

/* 🟢 發光重訓狀態格點 */
.calendar-day-btn.has-workout {
    border-color: rgba(0, 240, 255, 0.25);
    background: rgba(0, 240, 255, 0.02);
}

.workout-dot-glow {
    position: absolute;
    bottom: 5px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--color-cyan);
    box-shadow: 0 0 6px var(--color-cyan);
    animation: breatheGlow 2s infinite ease-in-out;
}

@keyframes breatheGlow {
    0% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 0.7; }
}

.calendar-footer-legend {
    display: flex;
    justify-content: center;
    font-size: 0.72rem;
    color: var(--text-sub);
    margin-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    padding-top: 0.85rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.dot-sample {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-cyan);
    box-shadow: 0 0 6px var(--color-cyan);
}

/* 📝 歷史明細面板 */
.detail-wrapper-area {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-height: 400px;
}

.detail-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 1rem;
    margin-bottom: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.flex-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 700;
}

/* 📊 歷史數據小指標 */
.history-stats-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.h-stat-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    background: rgba(18, 22, 36, 0.4);
    border: 1px solid var(--border-soft);
    padding: 0.75rem 1rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.h-stat-item:hover {
    transform: translateY(-1px);
}

.cyan-glow { border-color: rgba(0, 240, 255, 0.12); }
.cyan-glow:hover { border-color: rgba(0, 240, 255, 0.3); box-shadow: 0 0 10px rgba(0, 240, 255, 0.08); }

.blue-glow { border-color: rgba(47, 128, 237, 0.12); }
.blue-glow:hover { border-color: rgba(47, 128, 237, 0.3); box-shadow: 0 0 10px rgba(47, 128, 237, 0.08); }

.purple-glow { border-color: rgba(155, 93, 229, 0.12); }
.purple-glow:hover { border-color: rgba(155, 93, 229, 0.3); box-shadow: 0 0 10px rgba(155, 93, 229, 0.08); }

.h-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-sub);
}

.cyan-glow .h-stat-icon { background: rgba(0, 240, 255, 0.05); color: var(--color-cyan); }
.blue-glow .h-stat-icon { background: rgba(47, 128, 237, 0.05); color: var(--color-blue); }
.purple-glow .h-stat-icon { background: rgba(155, 93, 229, 0.05); color: var(--color-purple); }

.h-stat-info {
    display: flex;
    flex-direction: column;
}

.h-stat-num {
    font-size: 0.95rem;
    font-weight: 800;
    color: #FFF;
    font-family: 'Outfit', 'Inter', sans-serif;
}

.h-unit {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--text-muted);
}

.h-stat-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
    font-weight: 600;
}

/* 歷史動作清單 */
.history-exercises-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 480px;
    overflow-y: auto;
    padding-right: 4px;
}

/* 自訂捲軸樣式 */
.history-exercises-list::-webkit-scrollbar {
    width: 4px;
}
.history-exercises-list::-webkit-scrollbar-track {
    background: transparent;
}
.history-exercises-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
}

.h-exercise-block {
    background: rgba(18, 22, 36, 0.4);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.h-exercise-block:hover {
    border-color: rgba(0, 240, 255, 0.25);
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.08);
    transform: translateY(-1px);
}

.h-ex-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
    padding-bottom: 0.5rem;
    margin-bottom: 0.75rem;
}

.h-ex-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
}

.h-ex-title h3 {
    font-size: 0.88rem;
    font-weight: 800;
    color: #FFF;
}

.tag-muscle {
    background: rgba(0, 240, 255, 0.06);
    border: 1px solid rgba(0, 240, 255, 0.15);
    color: var(--color-cyan);
    font-size: 0.65rem;
}

.h-sets-table {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.h-set-pill {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    color: var(--text-sub);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-family: 'Outfit', 'Inter', sans-serif;
}

.h-set-pill.h-set-completed {
    background: rgba(0, 240, 255, 0.03);
    border-color: rgba(0, 240, 255, 0.15);
    color: var(--color-cyan);
}

.h-set-idx {
    color: var(--text-muted);
}

.h-set-completed .h-set-idx {
    color: rgba(0, 240, 255, 0.6);
}

.h-set-badge {
    margin-left: 2px;
    font-weight: 900;
}

/* 🔋 休息日空狀態 */
.empty-detail-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3.5rem 1.5rem;
    height: 100%;
}

.empty-spark-glow {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(0, 240, 255, 0.03);
    border: 1px solid rgba(0, 240, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.05);
}

.glow-svg {
    filter: drop-shadow(0 0 5px var(--color-cyan));
    animation: floatAnim 3s infinite ease-in-out;
}

@keyframes floatAnim {
    0% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-4px) scale(1.05); }
    100% { transform: translateY(0px) scale(1); }
}

.empty-detail-container h3 {
    font-size: 1.25rem;
    font-weight: 900;
    color: #FFF;
    font-family: 'Outfit', 'Inter', sans-serif;
    letter-spacing: 0.02em;
}

.rest-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--color-cyan);
    margin-top: 0.35rem;
    margin-bottom: 0.75rem;
}

.rest-desc {
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--text-sub);
    max-width: 320px;
    margin: 0 auto;
}

/* 📱 手機響應式排版 */
@media (max-width: 768px) {
    .history-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }
    
    .calendar-wrapper-card {
        padding: 0.85rem;
        background: rgba(13, 17, 30, 0.4);
        border-radius: 14px;
    }
    
    .detail-wrapper-area {
        min-height: auto;
        gap: 0.85rem;
    }
    
    .history-stats-bar {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }
    
    .h-stat-item {
        padding: 0.5rem;
        gap: 0.35rem;
        flex-direction: column;
        text-align: center;
        border-radius: 10px;
    }
    
    .h-stat-icon {
        width: 20px;
        height: 20px;
    }
    
    .h-stat-info {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .h-stat-num {
        font-size: 0.8rem !important;
    }
    
    .h-stat-label {
        font-size: 0.55rem !important;
    }
}
</style>
