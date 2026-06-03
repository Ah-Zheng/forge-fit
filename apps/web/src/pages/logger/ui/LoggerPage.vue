<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkoutStore } from '../../../entities/workout'
import { AlertCircle, Dumbbell, Trash2, Plus, Timer, Play, Pause, Sparkles, Check, Search, X, Scale, ChevronDown, ChevronUp } from 'lucide-vue-next'
/** 💡 導入共享的型別定義 */
import type { ExerciseSession, ExerciseDef } from '@forge-fit/types'
/** 💡 導入我們在 packages/core 中實作的常用負荷更新服務 */
import { updateExerciseLoadRecord } from '@forge-fit/core'
/** 💡 導入我們剛剛寫好的共享觸控步進器組件 (FSD 規範下的 shared/ui 層) */
import { TactileStepper } from '../../../shared/ui/stepper'
/** 💡 導入輕量級 Canvas 霓虹發光粒子雨引擎 */
import { NeonConfetti } from '../../../shared/lib/confetti'
import { useMediaQuery } from '../../../shared/lib/useMediaQuery'

const isMobile = useMediaQuery('(max-width: 768px)')

const store = useWorkoutStore()
const { todaySession, exercisesLibrary, isLoggerDrawerOpen } = storeToRefs(store)

// 💡 用 reactive 模擬 props 物件，達成 100% 模板相容，完全不需改動 template 程式碼！
const props = reactive({
    session: todaySession,
    exercisesLibrary: exercisesLibrary,
    openDrawerSignal: 0
})

// 💡 自定義 emit 方法模擬器，將事件引流至 Pinia Store Actions，維持 Template 100% 相容性！
const emit = (event: string, ...args: any[]) => {
    if (event === 'changeDate') {
        const [date] = args
        store.workoutDate = date
    } else if (event === 'refreshLibrary') {
        store.refreshLibrary()
    }
}

// 💡 監聽 Pinia 全局 isLoggerDrawerOpen，實現中央大 + 號點擊時打開抽屜的連動
watch(isLoggerDrawerOpen, (newVal) => {
    if (newVal) {
        isDrawerOpen.value = true
        isLoggerDrawerOpen.value = false // 自動重置以利下次觸發
    }
})

/** 💡 取得本地時區之今天日期字串，防止時區差導致誤判為歷史補記 */
const getTodayDateString = () => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}
const todayDateStr = ref(getTodayDateString())
const isToday = computed(() => props.session.date === todayDateStr.value)

// 💡 判斷過去的某個日期是否有重訓紀錄 (供週曆時光條點亮點使用)
const hasWorkoutOnDate = (dateStr: string) => {
    const item = localStorage.getItem(`workout:${dateStr}`)
    if (!item) return false
    try {
        const session = JSON.parse(item)
        return session.exercises && session.exercises.length > 0
    } catch {
        return false
    }
}

// 💡 月曆時光軸刷新觸發 Ref
const calendarRefreshTrigger = ref(0)
watch(() => props.session, () => {
    calendarRefreshTrigger.value++
}, { deep: true })

// 💡 宣告日曆收合/展開狀態，預設為 false (收合為單週週曆，節省過半版面)
const isCalendarExpanded = ref(false)

// 💡 當前月曆所展示與切換的基準月份 (預設與當前 session.date 對齊)
const currentMonth = ref<Date>(new Date(props.session.date))

// 💡 深度監聽外部 props.session.date 變化，自動校正當前展示月份
watch(() => props.session.date, (newDate) => {
    if (newDate) {
        currentMonth.value = new Date(newDate)
    }
}, { immediate: true })

// 💡 週曆計算子方法：計算當前選中日期所在的這一週（週一到週日，共 7 天）
const getWeeklyDays = () => {
    const current = new Date(props.session.date)
    const dayOfWeek = current.getDay()
    // 星期日則往前移 6 天，其餘往前移 dayOfWeek - 1 天，以此找出週一基準點
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(current)
    monday.setDate(current.getDate() - distanceToMonday)
    
    const days = []
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        
        days.push({
            dateStr,
            dayNum: date.getDate(),
            isCurrentMonth: true, // 週曆全部視為本月
            isToday: dateStr === todayDateStr.value,
            isSelected: dateStr === props.session.date,
            hasWorkout: hasWorkoutOnDate(dateStr)
        })
    }
    return days
}

// 💡 月曆計算子方法：計算當前選中月份所在的日期網格（動態選擇 35 天或 42 天，完美消除多餘下月第二週）
const getMonthlyDays = () => {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    
    // 1. 找出該月的第一天是星期幾
    const firstDayOfMonth = new Date(year, month, 1)
    const dayOfWeek = firstDayOfMonth.getDay()
    
    // 2. 計算星期一為起點的偏差距離
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    // 3. 算出日曆網格的第一天的 Date 物件
    const startGridDate = new Date(firstDayOfMonth)
    startGridDate.setDate(firstDayOfMonth.getDate() - distanceToMonday)
    
    // 4. 計算該月份的最後一天是幾號 (例如 30 號或 31 號)
    const lastDayVal = new Date(year, month + 1, 0).getDate()
    
    const days = []
    // 先預設產出 5 週（35 天）
    for (let i = 0; i < 35; i++) {
        const date = new Date(startGridDate)
        date.setDate(startGridDate.getDate() + i)
        
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        
        days.push({
            dateStr,
            dayNum: date.getDate(),
            isCurrentMonth: date.getMonth() === month,
            isToday: dateStr === todayDateStr.value,
            isSelected: dateStr === props.session.date,
            hasWorkout: hasWorkoutOnDate(dateStr)
        })
    }
    
    // 5. 智慧比對：檢查前 35 天中，是否已經完整包含（Cover）了當月最後一天
    const hasLastDay = days.some(d => d.isCurrentMonth && d.dayNum === lastDayVal)
    
    // 6. 若 35 天仍未包含最後一天（例如大月 31 號且當月從週六/日開始，會溢出至第 6 週），才補足 42 天
    if (!hasLastDay) {
        for (let i = 35; i < 42; i++) {
            const date = new Date(startGridDate)
            date.setDate(startGridDate.getDate() + i)
            
            const yyyy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, '0')
            const dd = String(date.getDate()).padStart(2, '0')
            const dateStr = `${yyyy}-${mm}-${dd}`
            
            days.push({
                dateStr,
                dayNum: date.getDate(),
                isCurrentMonth: date.getMonth() === month,
                isToday: dateStr === todayDateStr.value,
                isSelected: dateStr === props.session.date,
                hasWorkout: hasWorkoutOnDate(dateStr)
            })
        }
    }
    return days
}

// 💡 智慧響應式日曆網格計算：依據 isCalendarExpanded 狀態與是否為 PC 行動端動態分流
const calendarDays = computed(() => {
    // 💡 放入 trigger 達成 LocalStorage 資料增刪時的即時響應式點亮/熄滅圓點
    calendarRefreshTrigger.value
    
    // PC 版一律強制以一個月（Monthly）的方式呈現；手機行動版則支援折疊週曆/展開月曆
    if (!isMobile.value || isCalendarExpanded.value) {
        return getMonthlyDays()
    } else {
        return getWeeklyDays()
    }
})

// 💡 以月份為單位切換
const shiftMonth = (months: number) => {
    const next = new Date(currentMonth.value)
    next.setMonth(currentMonth.value.getMonth() + months)
    currentMonth.value = next
}

// 💡 以週為單位切換 (在週曆收合狀態下使用)
const shiftWeek = (weeks: number) => {
    const current = new Date(props.session.date)
    current.setDate(current.getDate() + weeks * 7)
    const yyyy = current.getFullYear()
    const mm = String(current.getMonth() + 1).padStart(2, '0')
    const dd = String(current.getDate()).padStart(2, '0')
    emit('changeDate', `${yyyy}-${mm}-${dd}`)
}

// 💡 動態解析當前日曆標頭所要顯示的年份與月份（PC端/週曆/月曆狀態即時自動適配）
const calendarTitle = computed(() => {
    if (!isMobile.value || isCalendarExpanded.value) {
        return `${currentMonth.value.getFullYear()}年 ${currentMonth.value.getMonth() + 1}月`
    } else {
        const d = new Date(props.session.date)
        return `${d.getFullYear()}年 ${d.getMonth() + 1}月`
    }
})

// 💡 一鍵快速回到今天 (Today Quick Return)
const goToToday = () => {
    const today = getTodayDateString()
    currentMonth.value = new Date(today)
    emit('changeDate', today)
}

/** 已同步的動作 ID 狀態快取，供綠色 ✓ 反饋動畫使用 */
const syncedExerciseIds = ref<Record<string, boolean>>({})

/** 💡 就地動作挑選抽屜相關響應式變數 */
const isDrawerOpen = ref(false)
const searchQuery = ref('')
const drawerCategory = ref('all')
const addedExerciseIds = ref<Record<string, boolean>>({})

// 分類選單定義
const drawerCategories = [
    { key: 'all', name: '全部' },
    { key: 'chest', name: '胸部' },
    { key: 'back', name: '背部' },
    { key: 'legs', name: '腿部' },
    { key: 'shoulders', name: '肩膀' },
    { key: 'arms', name: '手臂' }
]

// 智慧抽屜過濾列表
const filteredLibrary = computed(() => {
    if (!props.exercisesLibrary) return []
    return props.exercisesLibrary.filter(ex => {
        const matchCategory = drawerCategory.value === 'all' || ex.muscle === drawerCategory.value
        const matchSearch = ex.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                            getMuscleNameZh(ex.muscle).includes(searchQuery.value)
        return matchCategory && matchSearch
    })
})

// 判斷該動作是否已經加入今天的重訓日誌中
const isExerciseAlreadyAdded = (exerciseId: string) => {
    return props.session.exercises.some(ex => ex.exerciseId === exerciseId)
}

// 抽屜內點選新增動作
const handleAddExerciseFromDrawer = (ex: ExerciseDef) => {
    const exists = props.session.exercises.some(e => e.exerciseId === ex.id)
    if (!exists) {
        const defaultWeight = typeof ex.targetWeight === 'number' ? ex.targetWeight : 40
        const defaultReps = typeof ex.targetReps === 'number' ? ex.targetReps : 10
        
        props.session.exercises.push({
            exerciseId: ex.id,
            name: ex.name,
            muscle: ex.muscle,
            sets: [{ weight: defaultWeight, reps: defaultReps, completed: false }]
        })
        
        // 瞬間閃亮綠色 ✓ 反饋
        addedExerciseIds.value[ex.id] = true
        setTimeout(() => {
            addedExerciseIds.value[ex.id] = false
        }, 1500)
    }
}

// 鍵盤 Escape 關閉抽屜
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawerOpen.value) {
        isDrawerOpen.value = false
    }
}

// 監聽抽屜開關，鎖定/解鎖 Body 滾動，符合頂級 PWA 體驗
watch(isDrawerOpen, (isOpen) => {
    if (isOpen) {
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)
    } else {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
        // 關閉時重置搜尋與分類
        searchQuery.value = ''
        drawerCategory.value = 'all'
    }
})

/**
 * 💡 智慧超負荷突破比對演算法
 * 比對今日已完成組數的最大負荷是否優於動作百科中所儲存的常用適應負荷
 */
const checkIfOverloadBreakthrough = (ex: ExerciseSession) => {
    // 如果已經點擊了同步，2 秒內強制維持已同步狀態，不重置按鈕
    if (syncedExerciseIds.value[ex.exerciseId]) {
        return { isBreakthrough: false, maxWeight: 0, maxReps: 0, alreadySynced: true }
    }

    const completedSets = ex.sets.filter(s => s.completed)
    if (completedSets.length === 0) {
        return { isBreakthrough: false, maxWeight: 0, maxReps: 0, alreadySynced: false }
    }

    // 找出最大重量
    const maxWeight = Math.max(...completedSets.map(s => s.weight))
    // 找出最大重量下的最大次數
    const setsWithMaxWeight = completedSets.filter(s => s.weight === maxWeight)
    const maxReps = Math.max(...setsWithMaxWeight.map(s => s.reps))

    if (!props.exercisesLibrary) {
        return { isBreakthrough: false, maxWeight, maxReps, alreadySynced: false }
    }

    const def = props.exercisesLibrary.find(e => e.id === ex.exerciseId)
    if (!def) {
        return { isBreakthrough: false, maxWeight, maxReps, alreadySynced: false }
    }

    let isBreakthrough = false
    if (def.targetWeight === undefined || def.targetReps === undefined) {
        // 原本完全沒有設定過常用負荷，只要完成一組就屬於突破！
        isBreakthrough = true
    } else if (maxWeight > def.targetWeight) {
        isBreakthrough = true
    } else if (maxWeight === def.targetWeight && maxReps > def.targetReps) {
        isBreakthrough = true
    }

    return {
        isBreakthrough,
        maxWeight,
        maxReps,
        alreadySynced: false
    }
}

/**
 * 一鍵收割突破紀錄：同步寫入本地資料庫並通知頂層刷新
 */
const syncOverloadRecord = (ex: ExerciseSession) => {
    const check = checkIfOverloadBreakthrough(ex)
    if (!check.isBreakthrough) return

    // 寫入本地資料庫
    updateExerciseLoadRecord(ex.exerciseId, check.maxWeight, check.maxReps)

    // 觸發綠色 ✓ 發光反饋
    syncedExerciseIds.value[ex.exerciseId] = true

    // 通知 App.vue 重載常用動作庫，讓百科常用負荷背景同步刷新
    emit('refreshLibrary')

    // 2 秒後清空狀態，讓按鈕優雅隱退
    setTimeout(() => {
        syncedExerciseIds.value[ex.exerciseId] = false
    }, 2000)
}

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
        // 💡 智慧組數記憶：讀取最後一組的數據作為預設模板值
        const lastSet = exercise.sets[setsCount - 1]
        defaultWeight = lastSet.weight
        defaultReps = lastSet.reps
    } else if (props.exercisesLibrary) {
        // 💡 智慧資料連動：如果是安排今日的第一組，且動作庫百科中已有記錄常用可承受負荷，則自動帶入！
        const def = props.exercisesLibrary.find(e => e.id === exercise.exerciseId)
        if (def) {
            if (typeof def.targetWeight === 'number') defaultWeight = def.targetWeight
            if (typeof def.targetReps === 'number') defaultReps = def.targetReps
        }
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
    
    // 💡 健檢優化：僅清除定時器間隔，不可呼叫 pauseTimer()！
    // 這樣能將 isTimerActive = true 與基準時間戳完整保留在 LocalStorage 中，
    // 確保使用者切換分頁、重新整理、或重啟 PWA 時，離線背景計時器能平滑地利用時間戳差進行一次性補償。
    if (timerIntervalId) {
        window.clearInterval(timerIntervalId)
        timerIntervalId = null
    }
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
    <div class="logger-page-wrapper" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 💡 左側控制面板 (月曆 + 計時器) -->
        <div class="logger-left-column">


        <!-- 💡 區塊 1.2：Moze 記帳風：頂部可摺疊式時光日曆網格 (Collapsible Grid Calendar Bar) -->
        <div 
            class="weekly-calendar-bar monthly-calendar-bar glass-card" 
            :class="{ 'is-collapsed': isMobile && !isCalendarExpanded }"
            style="animation: fadeIn 0.3s ease"
        >
            <!-- 月份切換與摺疊狀態標題 -->
            <div class="calendar-header-row">
                <button 
                    class="btn-calendar-nav" 
                    @click="(!isMobile || isCalendarExpanded) ? shiftMonth(-1) : shiftWeek(-1)"
                    :title="(!isMobile || isCalendarExpanded) ? '上一個月' : '上一週'"
                >
                    &lt;
                </button>
                
                <div class="calendar-title-group">
                    <span class="calendar-month-title">
                        {{ calendarTitle }}
                    </span>
                    <Transition name="today-btn">
                        <button 
                            v-if="!isToday"
                            class="btn-go-today"
                            @click="goToToday"
                            title="回到今天"
                        >
                            今日
                        </button>
                    </Transition>
                </div>
                
                <button 
                    class="btn-calendar-nav" 
                    @click="(!isMobile || isCalendarExpanded) ? shiftMonth(1) : shiftWeek(1)"
                    :title="(!isMobile || isCalendarExpanded) ? '下一個月' : '下一週'"
                >
                    &gt;
                </button>
            </div>
            
            <!-- 星期標題行 -->
            <div class="calendar-weekdays-row">
                <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="weekday-header">{{ w }}</span>
            </div>
            
            <!-- 日期網格 (當收合時只會自動渲染 7 天，展開時渲染 42 天，純靠網格物理排列) -->
            <div class="calendar-days-grid">
                <div 
                    v-for="day in calendarDays" 
                    :key="day.dateStr"
                    class="calendar-day-card"
                    :class="{ 
                        'is-today': day.isToday,
                        'is-selected': day.isSelected,
                        'has-workout': day.hasWorkout,
                        'not-current-month': (!isMobile || isCalendarExpanded) && !day.isCurrentMonth
                    }"
                    @click="emit('changeDate', day.dateStr)"
                >
                    <span class="day-num">{{ day.dayNum }}</span>
                    <!-- 發光訓練指示點 -->
                    <span class="workout-dot" v-if="day.hasWorkout"></span>
                </div>
            </div>
            
            <!-- 💡 摺疊展開半透明 Chevrons 開關 (僅在行動端顯示，PC端固定為月曆，完美氣派) -->
            <div 
                v-if="isMobile"
                class="calendar-expand-trigger" 
                @click="isCalendarExpanded = !isCalendarExpanded"
                :title="isCalendarExpanded ? '收合為單週週曆' : '展開為整月月曆'"
            >
                <ChevronDown v-if="!isCalendarExpanded" :size="14" />
                <ChevronUp v-else :size="14" />
            </div>
        </div>

        <!-- 💡 區塊 1.8：毛玻璃科技風時長主控條 (Glassmorphic Timer Bar) -->
        <div class="timer-control-bar glass-card" style="animation: fadeIn 0.3s ease">
            <div class="timer-left-group">
                <div class="timer-icon-container" :class="{ 'timer-spinning': isTimerActive }">
                    <Timer :size="18" class="text-cyan" style="filter: drop-shadow(0 0 3px var(--color-cyan))" />
                </div>
                <div class="timer-label-group">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="timer-title">本日鍛鍊時長</span>
                        <span class="workout-status-badge" style="font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center;">鍛鍊中</span>
                    </div>
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
        </div> <!-- 💡 左側控制面板結束 -->
    </div> <!-- 💡 logger-left-column 結束 -->

        <!-- 💡 右側訓練日誌 (空狀態或卡片清單) -->
        <div class="logger-right-column">

        <!-- 💡 場景 1：本日無紀錄時的空狀態引導 -->
        <div
            v-if="props.session.exercises.length === 0"
            class="empty-state-container"
            style="text-align: center; padding: 2.5rem 1rem"
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
                {{ isToday ? '今天尚未安排任何動作' : '該日尚未安排任何動作' }}
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
                點擊底部 <strong>「＋」</strong> 按鈕，或至 <strong>「百科」</strong> 快速安排訓練動作。
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

                <!-- 新增與同步組數按鈕區塊 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; gap: 0.5rem; flex-wrap: wrap;">
                    <button
                        class="btn btn-secondary btn-sm"
                        @click="handleAddSet(ex)"
                        style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.25rem;
                        "
                    >
                        <Plus :size="14" /> 新增組數
                    </button>

                    <!-- 💡 智慧超負荷更新按鈕群 (收割最新成績回動作百科) -->
                    <template v-if="checkIfOverloadBreakthrough(ex).alreadySynced">
                        <span class="synced-badge">
                            <Check :size="12" /> 已同步常用負荷
                        </span>
                    </template>
                    <template v-else-if="checkIfOverloadBreakthrough(ex).isBreakthrough">
                        <button
                            class="btn-overload-sync cyan-pulsing-btn"
                            @click="syncOverloadRecord(ex)"
                            title="一鍵同步此漸進超負荷挑戰重量至動作百科常用備忘錄"
                        >
                            <Sparkles :size="12" class="text-cyan glow-cyan" />
                            <span>突破！同步負荷 {{ checkIfOverloadBreakthrough(ex).maxWeight }}kg × {{ checkIfOverloadBreakthrough(ex).maxReps }}下</span>
                        </button>
                    </template>
                </div>
            </div>
            

        </div> <!-- 💡 卡片 Container 結束 -->
    </div> <!-- 💡 右側訓練日誌結束 -->

    <!-- 💡 霓虹粒子雨 Canvas (高寬隨 Card 自動拉滿，層級最高但穿透) -->
        <Teleport to="body">
            <canvas ref="confettiCanvas" class="logger-confetti-canvas"></canvas>
        </Teleport>

        <!-- 💡 就地動作挑選抽屜 (Glassmorphic Picker Drawer) -->
        <Teleport to="body">
            <Transition name="fade">
                <div 
                    v-if="isDrawerOpen" 
                    class="drawer-overlay"
                    @click="isDrawerOpen = false"
                ></div>
            </Transition>
            
            <Transition name="slide-up">
                <div 
                    v-if="isDrawerOpen" 
                    class="drawer-aside glass-card"
                >
                    <!-- 抽屜頂部拖動手柄線 -->
                    <div class="drawer-handle" @click="isDrawerOpen = false"></div>
                    
                    <!-- 抽屜頭部 -->
                    <div class="drawer-header-row">
                        <div class="drawer-header-title">
                            <Sparkles :size="18" class="text-cyan glow-cyan" />
                            <span>就地挑選鍛鍊項目</span>
                        </div>
                        <button class="btn-close-drawer" @click="isDrawerOpen = false">
                            <X :size="20" />
                        </button>
                    </div>
                    
                    <!-- 搜尋欄 -->
                    <div class="drawer-search-bar">
                        <div class="search-input-wrapper">
                            <Search :size="16" class="search-icon" />
                            <input 
                                v-model="searchQuery"
                                type="text"
                                placeholder="輸入動作名稱或肌群關鍵字..."
                                class="search-input"
                            />
                            <button 
                                v-if="searchQuery" 
                                @click="searchQuery = ''" 
                                class="btn-clear-search"
                            >
                                <X :size="14" />
                            </button>
                        </div>
                    </div>
                    
                    <!-- 肌群快速分類選單 -->
                    <div class="drawer-filter-row">
                        <button
                            v-for="cat in drawerCategories"
                            :key="cat.key"
                            class="drawer-filter-btn"
                            :class="{ active: drawerCategory === cat.key }"
                            @click="drawerCategory = cat.key"
                        >
                            {{ cat.name }}
                        </button>
                    </div>
                    
                    <!-- 動作清單內容區 -->
                    <div class="drawer-content-list">
                        <div 
                            v-for="ex in filteredLibrary" 
                            :key="ex.id" 
                            class="drawer-item-card"
                            :class="{ 'item-already-in': isExerciseAlreadyAdded(ex.id) }"
                        >
                            <div class="drawer-item-left">
                                <div class="drawer-item-name">{{ ex.name }}</div>
                                <div class="drawer-item-meta">
                                    <span class="badge" :class="getMuscleTagClass(ex.muscle)">
                                        {{ getMuscleNameZh(ex.muscle) }}
                                    </span>
                                    
                                    <!-- 常用負荷標記 -->
                                    <span v-if="ex.targetWeight !== undefined" class="drawer-load-badge">
                                        <Scale :size="11" />
                                        <span>{{ ex.targetWeight }}kg × {{ ex.targetReps }}下</span>
                                    </span>
                                </div>
                            </div>
                            
                            <div class="drawer-item-right">
                                <!-- 已加入狀態 -->
                                <template v-if="isExerciseAlreadyAdded(ex.id)">
                                    <div class="drawer-added-status">
                                        <Check :size="14" />
                                        <span>已加入</span>
                                    </div>
                                </template>
                                <!-- 可新增狀態 -->
                                <template v-else>
                                    <button 
                                        @click="handleAddExerciseFromDrawer(ex)"
                                        class="btn-drawer-add"
                                        :class="{ 'success-anim': addedExerciseIds[ex.id] }"
                                        title="新增至重量日誌"
                                    >
                                        <Plus v-if="!addedExerciseIds[ex.id]" :size="16" />
                                        <Check v-else :size="16" />
                                    </button>
                                </template>
                            </div>
                        </div>
                        
                        <!-- 搜尋無資料 -->
                        <div 
                            v-if="filteredLibrary.length === 0" 
                            class="drawer-no-data"
                        >
                            沒有找到相符的訓練項目
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
/* 頁面內部微調微排版，大部分沿用全域 style.css 的變數定義 */
.logger-page-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 1rem;
}

/* 📱 手機與行動端包裝層 */
.logger-left-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.logger-right-column {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem; /* 💡 空狀態或列表卡片容器內部的間距 */
}

/* 🖥️ PC 大螢幕左右雙欄響應式佈局 (min-width: 1024px) */
@media (min-width: 1024px) {
    .logger-page-wrapper {
        display: grid !important;
        grid-template-columns: 30% 1fr !important;
        gap: 1.5rem !important;
        max-width: 100% !important;
        margin: 0;
        align-items: start;
    }
    
    .logger-left-column {
        position: sticky;
        top: 1rem;
        z-index: 10;
    }
    
    .logger-right-column {
        min-width: 0; /* 💡 防止 Flexbox 溢出跑版 */
    }

    /* 💡 PC端自適應優化：限制右側日誌卡片與補記欄的最大閱讀寬度，防止在大螢幕下過度拉伸 */
    .exercises-container,
    .backdating-notice-bar {
        max-width: 900px !important;
        width: 100% !important;
    }

    /* 🖥️ PC端專屬：大尺寸奢華毛玻璃日曆優化 */
    .weekly-calendar-bar {
        padding: 1.25rem 1.5rem !important;
        gap: 1.25rem !important;
        border-radius: 20px !important;
    }
    
    .calendar-month-title {
        font-size: 1.2rem !important; /* ➔ 月份標題明顯加大 */
    }
    
    .btn-calendar-nav {
        font-size: 1.1rem !important;
        width: 38px !important;
        height: 38px !important;
    }
    
    .weekday-header {
        font-size: 0.85rem !important; /* ➔ 星期文字（一、二、三...）加大 */
    }
    
    .calendar-weekdays-row {
        padding-bottom: 0.65rem !important;
    }
    
    .calendar-days-grid {
        gap: 0.5rem !important; /* ➔ 日期卡片間距拉開，呼吸感強烈 */
    }
    
    .day-num {
        font-size: 1.15rem !important; /* ➔ 數字明顯放大，極易閱讀 */
    }
    
    .calendar-day-card {
        border-radius: 10px !important;
    }
    
    .workout-dot {
        bottom: 6px !important;
        width: 5px !important; /* ➔ 發光訓練指示點加大 */
        height: 5px !important;
    }
    
    .calendar-day-card.is-today::after {
        top: 5px !important;
        right: 5px !important;
        width: 4px !important;
        height: 4px !important;
    }
}

/* 💡 智慧超負荷同步按鈕樣式 */
.btn-overload-sync {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.85rem;
    background: rgba(0, 240, 255, 0.08) !important;
    border: 1px solid rgba(0, 240, 255, 0.25) !important;
    border-radius: 20px;
    color: var(--color-cyan) !important;
    font-size: 0.72rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-overload-sync:hover {
    background: var(--color-cyan) !important;
    color: #121624 !important;
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.35);
    transform: translateY(-1px);
}
.btn-overload-sync:active {
    transform: scale(0.95);
}

/* 呼吸極光青特效 */
.cyan-pulsing-btn {
    animation: cyanPulse 2s infinite ease-in-out;
}
@keyframes cyanPulse {
    0% { border-color: rgba(0, 240, 255, 0.25); box-shadow: 0 0 4px rgba(0, 240, 255, 0.05); }
    50% { border-color: rgba(0, 240, 255, 0.5); box-shadow: 0 0 10px rgba(0, 240, 255, 0.15); }
    100% { border-color: rgba(0, 240, 255, 0.25); box-shadow: 0 0 4px rgba(0, 240, 255, 0.05); }
}

.synced-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.45rem 0.85rem;
    background: rgba(0, 255, 135, 0.08) !important;
    border: 1px solid rgba(0, 255, 135, 0.25) !important;
    border-radius: 20px;
    color: var(--color-success) !important;
    font-size: 0.72rem;
    font-weight: 800;
    animation: fadeIn 0.2s ease;
}

/* 💡 黃金毛玻璃補記警示條樣式 */
.backdating-notice-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 1rem;
    background: rgba(251, 188, 5, 0.06) !important;
    border: 1px solid rgba(251, 188, 5, 0.2) !important;
    border-radius: 10px;
    gap: 0.85rem;
    box-shadow: 0 0 15px rgba(251, 188, 5, 0.05);
    flex-shrink: 0;
}

.notice-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.notice-text {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-main);
}

.highlight-date {
    color: #fbbc05;
    text-shadow: 0 0 6px rgba(251, 188, 5, 0.3);
}

.text-yellow {
    color: #fbbc05;
}
.glow-yellow {
    filter: drop-shadow(0 0 4px rgba(251, 188, 5, 0.4));
}

.btn-return-today {
    background: rgba(251, 188, 5, 0.12) !important;
    border: 1px solid rgba(251, 188, 5, 0.25) !important;
    color: #fbbc05 !important;
    padding: 0.35rem 0.75rem;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
}

.btn-return-today:hover {
    background: #fbbc05 !important;
    color: #121624 !important;
    box-shadow: 0 0 10px rgba(251, 188, 5, 0.35);
    transform: translateY(-1px);
}
.btn-return-today:active {
    transform: scale(0.95);
}

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

/* 💡 霓虹粒子雨畫布覆蓋：改為 fixed 全螢幕噴灑，視覺震撼感倍增 */
.logger-confetti-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
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

/* 💡 ========================================== */
/* 💡 就地動作挑選抽屜 (Picker Drawer) 專屬樣式 */
/* 💡 ========================================== */

/* 遮罩層：模糊、微暗黑漸變背景 */
.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(10, 12, 22, 0.45);
    backdrop-filter: blur(10px);
    z-index: 10000;
}

/* 抽屜本體：底部靠攏、頂部圓角、PC端與手機端均完美居中/適配 */
.drawer-aside {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 75vh;
    max-height: 800px;
    background: rgba(18, 22, 36, 0.78) !important;
    backdrop-filter: blur(30px) saturate(180%);
    border-top: 1px solid rgba(0, 240, 255, 0.2);
    border-radius: 24px 24px 0 0;
    z-index: 10001;
    display: flex;
    flex-direction: column;
    padding: 0 1.5rem 1.5rem 1.5rem;
    box-shadow: 0 -10px 40px rgba(0, 240, 255, 0.15);
    overflow: hidden;
}

/* PC 桌上版：限制抽屜最大寬度，使其懸浮於中間，宛如高質感彈窗，氣度非凡 */
@media (min-width: 769px) {
    .drawer-aside {
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        border-left: 1px solid rgba(0, 240, 255, 0.2);
        border-right: 1px solid rgba(0, 240, 255, 0.2);
        border-radius: 24px 24px 0 0;
    }
}

/* 頂部拖動/指示手柄線 */
.drawer-handle {
    width: 40px;
    height: 4px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
    margin: 0.75rem auto 1rem auto;
    cursor: pointer;
    transition: background 0.2s ease;
}
.drawer-handle:hover {
    background: rgba(0, 240, 255, 0.4);
}

/* 抽屜頭部列 */
.drawer-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-shrink: 0;
}

.drawer-header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.15rem;
    font-weight: 800;
    color: #FFF;
    text-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
}

.btn-close-drawer {
    background: transparent;
    border: none;
    color: var(--text-sub);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
}
.btn-close-drawer:hover {
    color: #FFF;
    background: rgba(255, 255, 255, 0.08);
}

/* 搜尋區塊 */
.drawer-search-bar {
    margin-bottom: 1rem;
    flex-shrink: 0;
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
}

.search-icon {
    position: absolute;
    left: 1rem;
    color: var(--text-muted);
}

.search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 2.5rem;
    background: rgba(0, 0, 0, 0.25) !important;
    border: 1px solid var(--border-soft) !important;
    border-radius: 12px !important;
    color: #FFF !important;
    font-size: 0.9rem !important;
    transition: all 0.25s ease;
}
.search-input:focus {
    border-color: var(--color-cyan) !important;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.15) !important;
    background: rgba(0, 0, 0, 0.35) !important;
}

.btn-clear-search {
    position: absolute;
    right: 1rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.15rem;
    border-radius: 50%;
}
.btn-clear-search:hover {
    color: #FFF;
    background: rgba(255, 255, 255, 0.08);
}

/* 肌群快速分類選單 */
.drawer-filter-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scrollbar-width: none; /* Firefox */
    flex-shrink: 0;
}
.drawer-filter-row::-webkit-scrollbar {
    display: none; /* Safari & Chrome */
}

.drawer-filter-btn {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-soft);
    color: var(--text-sub);
    padding: 0.35rem 0.85rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
}
.drawer-filter-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #FFF;
}
.drawer-filter-btn.active {
    background: rgba(0, 240, 255, 0.1);
    border-color: var(--color-cyan);
    color: var(--color-cyan);
    box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
}

/* 動作清單內容區 */
.drawer-content-list {
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-right: 4px;
}

/* 動作卡片 */
.drawer-item-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.15rem;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-item-card:hover {
    border-color: rgba(0, 240, 255, 0.2);
    background: rgba(255, 255, 255, 0.035);
    box-shadow: 0 4px 15px rgba(0, 240, 255, 0.03);
}
.drawer-item-card.item-already-in {
    background: rgba(0, 255, 135, 0.02) !important;
    border-color: rgba(0, 255, 135, 0.15) !important;
}

.drawer-item-left {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
    margin-right: 1rem;
}

.drawer-item-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFF;
    word-break: break-word;
    line-height: 1.3;
}

.drawer-item-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.drawer-item-meta .badge {
    font-size: 0.65rem;
    padding: 1px 6px;
}

.drawer-load-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text-sub);
    background: rgba(255, 255, 255, 0.04);
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
}

/* 動作卡片右側按鈕/狀態 */
.drawer-item-right {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 已加入狀態 */
.drawer-added-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--color-success);
    background: rgba(0, 255, 135, 0.08);
    border: 1px solid rgba(0, 255, 135, 0.2);
    padding: 0.35rem 0.75rem;
    border-radius: 20px;
    animation: fadeIn 0.2s ease;
}

/* 可新增按鈕 */
.btn-drawer-add {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(0, 240, 255, 0.08) !important;
    border: 1px solid rgba(0, 240, 255, 0.25) !important;
    color: var(--color-cyan) !important;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-drawer-add:hover {
    background: var(--color-cyan) !important;
    color: #121624 !important;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.35);
    transform: scale(1.08);
}
.btn-drawer-add:active {
    transform: scale(0.92);
}

/* 新增成功時的綠色✓閃爍動畫 */
.btn-drawer-add.success-anim {
    background: var(--color-success) !important;
    border-color: var(--color-success) !important;
    color: #121624 !important;
    animation: bounceScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bounceScale {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

.drawer-no-data {
    text-align: center;
    padding: 3rem 0;
    color: var(--text-muted);
    font-size: 0.85rem;
}

/* 底部按鈕 Hover 輔助 */
.btn-bottom-add:hover {
    background: rgba(0, 240, 255, 0.08) !important;
    border-color: rgba(0, 240, 255, 0.45) !important;
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.1);
}
.btn-bottom-add:active {
    transform: scale(0.98);
}

/* 💡 ========================================== */
/* 💡 抽屜轉場動畫 (Transitions) */
/* 💡 ========================================== */

/* 1. 遮罩淡入淡出 */
.fade-enter-active, .fade-leave-active {
    transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}

/* 2. 抽屜由下往上升起 */
.slide-up-enter-active, .slide-up-leave-active {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0.8;
}

/* 桌機端升起動畫微調，保持完美的 translateX 軸居中 */
@media (min-width: 769px) {
    .slide-up-enter-from, .slide-up-leave-to {
        transform: translate(-50%, 100%);
    }
    .slide-up-enter-to, .slide-up-leave-from {
        transform: translate(-50%, 0);
    }
}

.weekly-calendar-bar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0.85rem 1rem;
    background: rgba(255, 255, 255, 0.01) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 16px;
    gap: 0.75rem;
    box-shadow: var(--shadow-card);
}

/* 月曆頭部：年份月份與切換按鈕 */
.calendar-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.calendar-month-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #FFF;
    font-family: 'Outfit', 'Inter', sans-serif;
    letter-spacing: 0.04em;
    text-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
}

/* 標題群組：月份 + 今日按鈕 */
.calendar-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* 「今日」快速返回按鈕 */
.btn-go-today {
    background: rgba(0, 240, 255, 0.1);
    border: 1px solid rgba(0, 240, 255, 0.3);
    color: var(--color-cyan);
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.02em;
    white-space: nowrap;
    line-height: 1.4;
}
.btn-go-today:hover {
    background: rgba(0, 240, 255, 0.18);
    border-color: rgba(0, 240, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
}
.btn-go-today:active {
    transform: scale(0.95);
}

/* 今日按鈕顯隱動畫 */
.today-btn-enter-active, .today-btn-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.today-btn-enter-from, .today-btn-leave-to {
    opacity: 0;
    transform: scale(0.85);
}

/* 星期欄位列 */
.calendar-weekdays-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    justify-items: center;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    padding-bottom: 0.35rem;
}

.weekday-header {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text-muted);
}

/* 42 天日期網格 */
.calendar-days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    width: 100%;
}

.calendar-day-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1; /* 100% 寬高比等長，塑造圓潤幾何美 */
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.calendar-day-card:hover {
    background: rgba(0, 240, 255, 0.05);
    border-color: rgba(0, 240, 255, 0.2);
}

.calendar-day-card.is-today {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
}

/* 當天選中狀態：高亮極光青霓虹發光邊框與淡背景 */
.calendar-day-card.is-selected {
    background: rgba(0, 240, 255, 0.1) !important;
    border-color: var(--color-cyan) !important;
    box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
    transform: scale(1.08);
    z-index: 5;
}

/* 非當前月份日期：大幅降噪淡化，但選中或有訓練時依然可看清 */
.calendar-day-card.not-current-month {
    opacity: 0.25;
}
.calendar-day-card.not-current-month:hover {
    opacity: 0.6;
}

.day-num {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-sub);
    font-family: 'Outfit', 'Inter', sans-serif;
    transition: all 0.2s ease;
}

.calendar-day-card:hover .day-num {
    color: #FFF;
}

.calendar-day-card.is-selected .day-num {
    color: var(--color-cyan);
    font-weight: 800;
    text-shadow: 0 0 6px rgba(0, 240, 255, 0.4);
}

/* 訓練記錄指示點：高亮發光極光青小圓圈，宛如星光 */
.workout-dot {
    position: absolute;
    bottom: 4px;
    width: 3.5px;
    height: 3.5px;
    background: var(--color-cyan);
    border-radius: 50%;
    box-shadow: 0 0 4px var(--color-cyan);
}

/* 今天的小裝飾點 */
.calendar-day-card.is-today::after {
    content: '';
    position: absolute;
    top: 3px;
    right: 3px;
    width: 3px;
    height: 3px;
    background: var(--color-cyan);
    border-radius: 50%;
    box-shadow: 0 0 3px var(--color-cyan);
}

/* 月份導航按鈕 */
.btn-calendar-nav {
    background: transparent;
    border: none;
    color: var(--text-sub);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 800;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.btn-calendar-nav:hover {
    color: var(--color-cyan);
    background: rgba(0, 240, 255, 0.08);
}

/* 💡 展開收合指示器 */
.calendar-expand-trigger {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin-top: 0.35rem;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
}

.calendar-expand-trigger:hover {
    color: var(--color-cyan);
    filter: drop-shadow(0 0 3px var(--color-cyan));
}
</style>
