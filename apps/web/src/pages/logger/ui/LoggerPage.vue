<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWorkoutStore, useRestTimerStore } from '../../../entities/workout'
import { useDialogStore } from '../../../shared/ui/dialog/dialogStore'
import {
    AlertCircle,
    Dumbbell,
    Trash2,
    Plus,
    Timer,
    Sparkles,
    Check,
    Search,
    X,
    Scale,
    ChevronDown,
    ChevronUp,
    Lock
} from '@lucide/vue'
/** 💡 導入共享的型別定義 */
import type { ExerciseSession, ExerciseDef } from '@forge-fit/types'
/** 💡 導入我們在 packages/core 中實作的常用負荷更新服務與歷史紀錄檢查服務 */
import { updateExerciseLoadRecord, hasWorkoutOnDate } from '@forge-fit/core'
/** 💡 導入我們剛剛寫好的共享觸控步進器組件 (FSD 規範下的 shared/ui 層) */
import { TactileStepper } from '../../../shared/ui/stepper'
/** 💡 導入輕量級 Canvas 霓虹發光粒子雨引擎 */
import { NeonConfetti } from '../../../shared/lib/confetti'
import { useMediaQuery } from '../../../shared/lib/useMediaQuery'

const isMobile = useMediaQuery('(max-width: 768px)')
const route = useRoute()

const store = useWorkoutStore()
const dialogStore = useDialogStore()
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
watch(isLoggerDrawerOpen, newVal => {
    if (newVal) {
        if (props.session.completed) {
            isLoggerDrawerOpen.value = false
            dialogStore.alert('本日訓練已圓滿結束並封存，無法再新增動作。如需修改，請先至看板控制台解鎖編輯。', '訓練已結束', { type: 'warning' })
            return
        }
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

/** 💡 安全跨瀏覽器解析 YYYY-MM-DD 為本地時間的 Date 物件，避免時區偏置坑 */
const parseLocalDate = (dateStr: string) => {
    return new Date(dateStr.replace(/-/g, '/'))
}

// 💡 月曆時光軸刷新觸發 Ref
const calendarRefreshTrigger = ref(0)
watch(
    () => props.session,
    () => {
        calendarRefreshTrigger.value++
    },
    { deep: true }
)

// 💡 宣告日曆收合/展開狀態，預設為 false (收合為單週週曆，節省過半版面)
const isCalendarExpanded = ref(false)

// 💡 當前月曆所展示與切換的基準月份 (預設與當前 session.date 對齊)
const currentMonth = ref<Date>(parseLocalDate(props.session.date))

// 💡 深度監聽外部 props.session.date 變化，自動校正當前展示月份
watch(
    () => props.session.date,
    newDate => {
        if (newDate) {
            currentMonth.value = parseLocalDate(newDate)
        }
    },
    { immediate: true }
)

// 💡 週曆計算子方法：計算當前選中日期所在的這一週（週一到週日，共 7 天）
const getWeeklyDays = () => {
    const current = parseLocalDate(props.session.date)
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
    const current = parseLocalDate(props.session.date)
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
        const d = parseLocalDate(props.session.date)
        return `${d.getFullYear()}年 ${d.getMonth() + 1}月`
    }
})

// 💡 一鍵快速回到今天 (Today Quick Return)
const goToToday = () => {
    const today = getTodayDateString()
    currentMonth.value = parseLocalDate(today)
    emit('changeDate', today)
}

// 💡 點擊日期卡片的處理方法：若點選非當前月份日期，主動同步切換基準月份
const selectDate = (day: { dateStr: string; isCurrentMonth: boolean }) => {
    emit('changeDate', day.dateStr)
    if (!day.isCurrentMonth) {
        currentMonth.value = parseLocalDate(day.dateStr)
    }
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
        const matchSearch =
            ex.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
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
    if (props.session.completed) return // 🔒 已結束/封存
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

        // 💡 新增時自動展開該卡片以利使用者填寫
        expandedExerciseId.value = ex.id

        // 瞬間閃亮綠色 ✓ 反饋
        addedExerciseIds.value[ex.id] = true
        setTimeout(() => {
            addedExerciseIds.value[ex.id] = false
        }, 1500)
    } else {
        // 如果已經存在，也自動幫使用者展開以利查看
        expandedExerciseId.value = ex.id
    }
}

// 鍵盤 Escape 關閉抽屜
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawerOpen.value) {
        isDrawerOpen.value = false
    }
}

// 監聽抽屜開關，鎖定/解鎖 Body 滾動，符合頂級 PWA 體驗
watch(isDrawerOpen, isOpen => {
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
    if (props.session.completed) return // 🔒 已結束/封存
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



/**
 * 刪除整組運動動作的處理邏輯
 */
const handleDeleteExercise = async (index: number) => {
    if (props.session.completed) return // 🔒 已結束/封存
    const confirmDelete = await dialogStore.confirm(
        '確定要移除此動作與所有組數紀錄嗎？移除後資料將無法復原。',
        '確認移除動作',
        { type: 'danger', confirmText: '確定移除', cancelText: '取消' }
    )
    if (confirmDelete) {
        // 透過直接突變陣列，App.vue 中的 deep watch 會立即感知並自動存檔 LocalStorage！
        props.session.exercises.splice(index, 1)
    }
}

/**
 * 刪除單一組數的處理邏輯
 */
const handleDeleteSet = (exercise: ExerciseSession, setIdx: number) => {
    if (props.session.completed) return // 🔒 已結束/封存
    exercise.sets.splice(setIdx, 1)
}

/**
 * ⚡ 智慧組數記憶 (Smart Set Copier) 邏輯
 * 新增組數時，自動複製上一組的重量與次數，免去手動重複調整的麻煩。
 */
const handleAddSet = (exercise: ExerciseSession) => {
    if (props.session.completed) return // 🔒 已結束/封存
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
 * 快捷微調運動時長 (例如加減 5 分鐘)
 * @param minutes 調整的分鐘差值 (如 -5 或 5)
 */
const adjustDuration = (minutes: number) => {
    if (props.session.completed) return // 🔒 已結束/封存
    if (isToday.value) {
        store.adjustGlobalDuration(minutes)
    } else {
        props.session.duration = Math.max(0, (props.session.duration || 0) + minutes)
        props.session.secondsElapsed = props.session.duration * 60
    }
}

const checkFocusQuery = () => {
    const focusId = route.query.focus as string
    if (focusId) {
        expandedExerciseId.value = focusId
        nextTick(() => {
            const element = document.getElementById(`ex-card-${focusId}`)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        })
    }
}

watch(
    () => route.query.focus,
    () => {
        checkFocusQuery()
    }
)

onMounted(() => {
    if (confettiCanvas.value) {
        confettiEngine = new NeonConfetti(confettiCanvas.value)
    }
    checkFocusQuery()
})

onUnmounted(() => {
    if (confettiEngine) {
        confettiEngine.destroy()
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



/** 💡 當前展開的動作卡片 ID (若為 null 則代表全部折疊，一次僅能展開一組動作) */
const expandedExerciseId = ref<string | null>(null)

/**
 * 展開 / 折疊指定動作卡片
 */
const toggleExpand = (exerciseId: string) => {
    if (expandedExerciseId.value === exerciseId) {
        expandedExerciseId.value = null
    } else {
        expandedExerciseId.value = exerciseId
    }
}

/**
 * 💡 當勾選或取消完成某組時的處理邏輯 (組間休息自動計時)
 */
const handleSetCompleteChange = (exercise: ExerciseSession, set: any) => {
    if (set.completed && !props.session.completed) {
        const timerStore = useRestTimerStore()
        // 💡 啟動全域休息計時器 (自訂全域時間)
        timerStore.startRest(timerStore.globalRestDuration, exercise.name)
    }
}

/**
 * 💡 計算折疊狀態下的組數概覽資訊（組數、重量範圍、次數範圍）
 */
const getSetsSummary = (ex: ExerciseSession) => {
    const setsCount = ex.sets.length
    if (setsCount === 0) return '尚未新增組數'

    const weights = ex.sets.map(s => s.weight)
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)
    const weightStr = minWeight === maxWeight ? `${minWeight}kg` : `${minWeight}-${maxWeight}kg`

    const reps = ex.sets.map(s => s.reps)
    const minReps = Math.min(...reps)
    const maxReps = Math.max(...reps)
    const repsStr = minReps === maxReps ? `${minReps}次` : `${minReps}-${maxReps}次`

    return `${setsCount} 組 · ${weightStr} · ${repsStr}`
}

// 💡 觸控左右滑動手勢偵測：實現滑動切換月份/週功能
let touchStartX = 0
let touchStartY = 0

const handleTouchStart = (e: TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
    }
}

const handleTouchEnd = (e: TouchEvent) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY

    const diffX = touchEndX - touchStartX
    const diffY = touchEndY - touchStartY

    // 水平滑動閾值 50px，且水平傾斜度需大於垂直滑動 1.5 倍以避免上下滾動時誤觸
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (diffX < 0) {
            // 向左滑：看下一個月 / 下一週
            if (!isMobile.value || isCalendarExpanded.value) {
                shiftMonth(1)
            } else {
                shiftWeek(1)
            }
        } else {
            // 向右滑：看上一個月 / 上一週
            if (!isMobile.value || isCalendarExpanded.value) {
                shiftMonth(-1)
            } else {
                shiftWeek(-1)
            }
        }
    }
}
</script>

<template>
    <div class="logger-page-wrapper" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 🔒 本日訓練已結束/封存通知 -->
        <div v-if="props.session.completed" class="workout-completed-notice full-width glass-card">
            <Lock :size="16" class="text-warning" />
            <span class="notice-text">
                本日訓練已結束並封存。如需新增或修改紀錄，請先至
                <router-link to="/" class="btn-goto-dashboard">看板控制台</router-link>
                解鎖編輯。
            </span>
        </div>

        <!-- 💡 左側控制面板 (月曆 + 計時器) -->
        <div class="logger-left-column">
            <!-- 💡 區塊 1.2：Moze 記帳風：頂部可摺疊式時光日曆網格 (Collapsible Grid Calendar Bar) -->
            <div
                class="weekly-calendar-bar monthly-calendar-bar glass-card"
                :class="{ 'is-collapsed': isMobile && !isCalendarExpanded }"
                style="animation: fadeIn 0.3s ease"
                @touchstart="handleTouchStart"
                @touchend="handleTouchEnd"
            >
                <!-- 月份切換與摺疊狀態標題 -->
                <div class="calendar-header-row">
                    <button
                        class="btn-calendar-nav"
                        :title="!isMobile || isCalendarExpanded ? '上一個月' : '上一週'"
                        @click="!isMobile || isCalendarExpanded ? shiftMonth(-1) : shiftWeek(-1)"
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
                                title="回到今天"
                                @click="goToToday"
                            >
                                今日
                            </button>
                        </Transition>
                    </div>

                    <button
                        class="btn-calendar-nav"
                        :title="!isMobile || isCalendarExpanded ? '下一個月' : '下一週'"
                        @click="!isMobile || isCalendarExpanded ? shiftMonth(1) : shiftWeek(1)"
                    >
                        &gt;
                    </button>
                </div>

                <!-- 星期標題行 -->
                <div class="calendar-weekdays-row">
                    <span
                        v-for="w in ['一', '二', '三', '四', '五', '六', '日']"
                        :key="w"
                        class="weekday-header"
                        >{{ w }}</span
                    >
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
                            'not-current-month':
                                (!isMobile || isCalendarExpanded) && !day.isCurrentMonth
                        }"
                        @click="selectDate(day)"
                    >
                        <span class="day-num">{{ day.dayNum }}</span>
                        <!-- 發光訓練指示點 -->
                        <span v-if="day.hasWorkout" class="workout-dot"></span>
                    </div>
                </div>

                <!-- 💡 摺疊展開半透明 Chevrons 開關 (僅在行動端顯示，PC端固定為月曆，完美氣派) -->
                <div
                    v-if="isMobile"
                    class="calendar-expand-trigger"
                    :title="isCalendarExpanded ? '收合為單週週曆' : '展開為整月月曆'"
                    @click="isCalendarExpanded = !isCalendarExpanded"
                >
                    <ChevronDown v-if="!isCalendarExpanded" :size="14" />
                    <ChevronUp v-else :size="14" />
                </div>
            </div>

            <!-- 💡 區塊 1.8：極簡時長顯示與微調 (極致瘦身版) -->
            <div class="minimal-duration-bar glass-card">
                <div class="duration-left">
                    <Timer
                        :size="14"
                        class="text-cyan timer-icon"
                    />
                    <span class="duration-label">已鍛鍊：</span>
                    <span class="duration-value">{{ props.session.duration || 0 }} 分鐘</span>
                </div>
                <div class="duration-right">
                    <button
                        class="btn-duration-step"
                        title="減少 5 分鐘"
                        :disabled="props.session.completed"
                        @click="adjustDuration(-5)"
                    >
                        -5m
                    </button>
                    <button
                        class="btn-duration-step"
                        title="增加 5 分鐘"
                        :disabled="props.session.completed"
                        @click="adjustDuration(5)"
                    >
                        +5m
                    </button>
                </div>
            </div>
            <!-- 💡 左側控制面板結束 -->
        </div>
        <!-- 💡 logger-left-column 結束 -->

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
                <h3
                    style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem"
                >
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
                    點擊底部 <strong>「＋」</strong> 按鈕，或至
                    <strong>「百科」</strong> 快速安排訓練動作。
                </p>
            </div>

            <div v-else class="exercises-container">
                <div
                    v-for="(ex, exIdx) in props.session.exercises"
                    :key="ex.exerciseId"
                    :id="`ex-card-${ex.exerciseId}`"
                    class="exercise-block card-glow-blue"
                    :class="{
                        'exercise-all-completed':
                            ex.sets.length > 0 && ex.sets.every(s => s.completed),
                        'is-collapsed': expandedExerciseId !== ex.exerciseId
                    }"
                    style="margin-bottom: 1.5rem; animation: fadeInUp 0.3s ease forwards"
                >
                    <!-- 💡 特價傳單風的尖刺黃金突破徽章 (右上角絕對定位) -->
                    <div
                        v-if="checkIfOverloadBreakthrough(ex).isBreakthrough"
                        class="spiky-breakthrough-badge"
                        title="今日此項目已突破常用負荷紀錄！"
                    >
                        <span>突破</span>
                    </div>

                    <!-- 動作卡片頭部資訊 (點選主要區域可展開/折疊) -->
                    <div
                        class="exercise-header"
                        style="cursor: pointer; user-select: none"
                        @click="toggleExpand(ex.exerciseId)"
                    >
                        <div
                            class="exercise-title-area"
                            style="flex: 1; min-width: 0; display: flex; align-items: flex-start"
                        >
                            <div class="exercise-icon" style="margin-top: 2px">
                                <Dumbbell :size="16" class="text-cyan" />
                            </div>
                            <div style="flex: 1; min-width: 0">
                                <!-- 第一行：器材名稱 平行 分類標籤 -->
                                <div
                                    style="
                                        display: flex;
                                        align-items: center;
                                        gap: 0.5rem;
                                        flex-wrap: wrap;
                                    "
                                >
                                    <h3 class="exercise-name" style="margin-bottom: 0">
                                        {{ ex.name }}
                                    </h3>
                                    <span
                                        class="badge"
                                        :class="getMuscleTagClass(ex.muscle)"
                                        style="display: inline-block"
                                    >
                                        {{ getMuscleNameZh(ex.muscle) }} ({{
                                            ex.muscle.toUpperCase()
                                        }})
                                    </span>
                                </div>

                                <!-- 第二行：顯示 器材數據 + 完成數量統計 (並排在同一行) -->
                                <div
                                    style="
                                        margin-top: 0.35rem;
                                        min-height: 20px;
                                        display: flex;
                                        align-items: center;
                                        gap: 0.5rem;
                                        flex-wrap: wrap;
                                        width: 100%;
                                    "
                                >
                                    <!-- 器材數據 (常駐顯示) -->
                                    <span
                                        class="exercise-summary-badge"
                                        style="margin-left: 0; flex-shrink: 0"
                                    >
                                        {{ getSetsSummary(ex) }}
                                    </span>

                                    <!-- 完成數量統計 (常駐) -->
                                    <span
                                        v-if="ex.sets.length > 0"
                                        class="badge-sets-progress"
                                        :class="{
                                            'all-completed-glow': ex.sets.every(s => s.completed)
                                        }"
                                        style="flex-shrink: 0"
                                    >
                                        完成 {{ ex.sets.filter(s => s.completed).length }}/{{
                                            ex.sets.length
                                        }}組
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- 右側操作區：極簡 Chevron 指示圖示 (引導使用者點擊展開，解決引導痛點) -->
                        <div
                            style="
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 24px;
                                flex-shrink: 0;
                                align-self: center;
                            "
                        >
                            <span
                                class="expand-chevron"
                                style="color: var(--text-muted); display: flex; align-items: center"
                            >
                                <ChevronDown
                                    v-if="expandedExerciseId !== ex.exerciseId"
                                    :size="14"
                                />
                                <ChevronUp v-else :size="14" />
                            </span>
                        </div>
                    </div>

                    <!-- 動作明細細節區 (僅在展開時顯示) -->
                    <div
                        v-show="expandedExerciseId === ex.exerciseId"
                        class="exercise-card-details"
                        style="animation: fadeIn 0.2s ease"
                    >
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
                                <TactileStepper v-model="set.weight" :step="2.5" :disabled="set.completed || props.session.completed" />

                                <!-- 🔢 次數步進器：每點一下加減 1 下 -->
                                <TactileStepper v-model="set.reps" :step="1" :disabled="set.completed || props.session.completed" />

                                <label class="checkbox-container">
                                    <input 
                                        v-model="set.completed" 
                                        type="checkbox" 
                                        :disabled="props.session.completed" 
                                        @change="handleSetCompleteChange(ex, set)"
                                    />
                                    <span class="checkmark"></span>
                                </label>

                                <!-- 🗑️ 刪除單組按鈕 -->
                                <button
                                    type="button"
                                    class="btn-icon delete-set-btn"
                                    :disabled="set.completed || props.session.completed"
                                    title="刪除此組"
                                    @click="handleDeleteSet(ex, setIdx)"
                                >
                                    <Trash2 :size="14" />
                                </button>
                            </div>
                        </div>

                        <!-- 💡 整合操作按鈕區塊：管理按鈕左側垂直排列，同步按鈕右側對齊 -->
                        <div
                            style="
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-end;
                                margin-top: 1rem;
                                gap: 0.5rem;
                                flex-wrap: wrap;
                            "
                        >
                            <!-- 左側：動作管理按鈕（新增組數 + 移除此動作，垂直排列） -->
                            <div class="logger-action-buttons-group">
                                <button
                                    class="btn btn-secondary btn-sm"
                                    :disabled="props.session.completed"
                                    style="
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 0.25rem;
                                    "
                                    @click="handleAddSet(ex)"
                                >
                                    <Plus :size="14" /> 新增組數
                                </button>
 
                                <button
                                    class="btn btn-delete-exercise btn-sm"
                                    title="移除此訓練器材動作與所有組數紀錄"
                                    :disabled="props.session.completed"
                                    style="
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 0.25rem;
                                    "
                                    @click="handleDeleteExercise(exIdx)"
                                >
                                    <Trash2 :size="12" /> 移除此動作
                                </button>
                            </div>
 
                            <!-- 右側：智慧超負荷同步按鈕 -->
                            <div
                                style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: flex-end;
                                    margin-bottom: 2px;
                                "
                            >
                                <template v-if="checkIfOverloadBreakthrough(ex).alreadySynced">
                                    <span class="synced-badge">
                                        <Check :size="12" /> 已更新為預設重量
                                    </span>
                                </template>
                                <template
                                    v-else-if="checkIfOverloadBreakthrough(ex).isBreakthrough"
                                >
                                    <button
                                        class="btn-sync-overload"
                                        title="將此挑戰新紀錄更新為此動作的預設重量"
                                        :disabled="props.session.completed"
                                        style="
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 0.25rem;
                                        "
                                        @click="syncOverloadRecord(ex)"
                                    >
                                        <Sparkles :size="12" />
                                        <span>將突破紀錄更新為預設重量</span>
                                    </button>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- 💡 卡片 Container 結束 -->
        </div>
        <!-- 💡 右側訓練日誌結束 -->

        <!-- 💡 霓虹粒子雨 Canvas (高寬隨 Card 自動拉滿，層級最高但穿透) -->
        <Teleport to="body">
            <canvas ref="confettiCanvas" class="logger-confetti-canvas"></canvas>
        </Teleport>

        <!-- 💡 就地動作挑選抽屜 (Glassmorphic Picker Drawer) -->
        <Teleport to="body">
            <Transition name="fade">
                <div v-if="isDrawerOpen" class="drawer-overlay" @click="isDrawerOpen = false"></div>
            </Transition>

            <Transition name="slide-up">
                <div v-if="isDrawerOpen" class="drawer-aside glass-card">
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
                                class="btn-clear-search"
                                @click="searchQuery = ''"
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
                                    <span
                                        v-if="ex.targetWeight !== undefined"
                                        class="drawer-load-badge"
                                    >
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
                                        class="btn-drawer-add"
                                        :class="{ 'success-anim': addedExerciseIds[ex.id] }"
                                        @click="handleAddExerciseFromDrawer(ex)"
                                        title="新增至重量日誌"
                                    >
                                        <Plus v-if="!addedExerciseIds[ex.id]" :size="16" />
                                        <Check v-else :size="16" />
                                    </button>
                                </template>
                            </div>
                        </div>

                        <!-- 搜尋無資料 -->
                        <div v-if="filteredLibrary.length === 0" class="drawer-no-data">
                            沒有找到相符的訓練項目
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped lang="scss">
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
    0% {
        border-color: rgba(0, 240, 255, 0.25);
        box-shadow: 0 0 4px rgba(0, 240, 255, 0.05);
    }
    50% {
        border-color: rgba(0, 240, 255, 0.5);
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
    }
    100% {
        border-color: rgba(0, 240, 255, 0.25);
        box-shadow: 0 0 4px rgba(0, 240, 255, 0.05);
    }
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
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    cursor: pointer;
    opacity: 1;
    pointer-events: auto;

    &:hover:not(:disabled) {
        color: var(--color-danger) !important;
        filter: drop-shadow(0 0 4px var(--color-danger));
        transform: scale(1.1);
    }
    
    &:active:not(:disabled) {
        transform: scale(0.9);
    }

    &:disabled {
        cursor: not-allowed !important;
        opacity: 0.35 !important;
        pointer-events: none !important;
    }
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
    position: relative;
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
    0% {
        transform: rotate(0deg) scale(1);
    }
    50% {
        transform: rotate(180deg) scale(1.08);
    }
    100% {
        transform: rotate(360deg) scale(1);
    }
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
    color: #fff !important;
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

.btn-timer:active,
.btn-timer-step:active {
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
    color: #fff;
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
    color: #fff;
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
    color: #fff;
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
    color: #fff !important;
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
    color: #fff;
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
    color: #fff;
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
    color: #fff;
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
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.3);
    }
    100% {
        transform: scale(1);
    }
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
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* 2. 抽屜由下往上升起 */
.slide-up-enter-active,
.slide-up-leave-active {
    transition:
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0.8;
}

/* 桌機端升起動畫微調，保持完美的 translateX 軸居中 */
@media (min-width: 769px) {
    .slide-up-enter-from,
    .slide-up-leave-to {
        transform: translate(-50%, 100%);
    }
    .slide-up-enter-to,
    .slide-up-leave-from {
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
    color: #fff;
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
.today-btn-enter-active,
.today-btn-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
}
.today-btn-enter-from,
.today-btn-leave-to {
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
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 159, 10, 0.25) !important;
}

/* 今天的文字顏色在未被選中時呈現黃金橘，已被選中時則使用選中的極光青色 */
.calendar-day-card.is-today:not(.is-selected) .day-num {
    color: #ff9f0a !important;
    font-weight: 800;
    text-shadow: 0 0 5px rgba(255, 159, 10, 0.35);
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
    color: #fff;
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

/* 💡 動作卡片折疊/展開細節優化 */
.exercise-block {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.exercise-block.is-collapsed {
    padding: 0.85rem 1.25rem !important;
}

.exercise-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important; /* ➔ 改為 center，使標題與右側按鈕完美居中對齊 */
    margin-bottom: 1rem;
    transition: margin 0.25s ease;
}

.exercise-block.is-collapsed .exercise-header {
    margin-bottom: 0 !important;
}

/* 💡 動作卡片折疊概覽 Badge 樣式 */
.exercise-summary-badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-cyan);
    background: rgba(0, 240, 255, 0.05);
    border: 1px solid rgba(0, 240, 255, 0.15);
    border-radius: 4px;
    padding: 2px 6px;
    letter-spacing: 0.02em;
    filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.1));
    margin-left: 0.25rem;
    animation: fadeIn 0.2s ease;
}

/* 展開折疊 Chevron 指示器 */
.expand-chevron {
    transition: transform 0.2s ease;
    opacity: 0.7;
}

.exercise-header:hover .expand-chevron {
    opacity: 1;
    color: var(--color-cyan);
    filter: drop-shadow(0 0 3px var(--color-cyan));
}

/* 🗑️ 移除此動作按鈕樣式 (高寬規範與 btn-sm 對齊) */
.btn-delete-exercise {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem !important;
    font-weight: 700;
    color: var(--color-danger) !important;
    background: rgba(255, 74, 74, 0.04) !important;
    border: 1px solid rgba(255, 74, 74, 0.15) !important;
    padding: 0.52rem 1.25rem !important;
    border-radius: 8px !important;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    justify-content: center;
}

.btn-delete-exercise:hover {
    background: var(--color-danger) !important;
    color: #fff !important;
    box-shadow: 0 0 10px rgba(255, 74, 74, 0.25);
    border-color: var(--color-danger) !important;
}

.btn-delete-exercise:active {
    transform: scale(0.95);
}

/* 💡 同步常用負荷按鈕樣式 (無重複標語，純功能性) */
.btn-sync-overload {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--color-cyan) !important;
    background: rgba(0, 240, 255, 0.04) !important;
    border: 1px solid rgba(0, 240, 255, 0.18) !important;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-sync-overload:hover {
    background: var(--color-cyan) !important;
    color: #121624 !important;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
    border-color: var(--color-cyan) !important;
}

.btn-sync-overload:active {
    transform: scale(0.95);
}

/* 💡 訓練動作管理按鈕組 (支援響應式滿寬與 PC 寬度對齊) */
.logger-action-buttons-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    flex-shrink: 0;
}

@media (min-width: 576px) {
    .logger-action-buttons-group {
        max-width: 135px; /* PC 端限制寬度，與原新增組數按鈕的合理寬度一致 */
    }
}

/* 💡 常駐組數進度統計 Badge */
.badge-sets-progress {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text-sub) !important;
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 4px;
    padding: 2px 6px;
    letter-spacing: 0.02em;
    transition: all 0.3s ease;
}

/* 當該器材今日所有組數皆完成時，高亮亮眼皇家綠 */
.badge-sets-progress.all-completed-glow {
    color: var(--color-success) !important;
    background: rgba(0, 255, 135, 0.06) !important;
    border-color: rgba(0, 255, 135, 0.25) !important;
    filter: drop-shadow(0 0 4px rgba(0, 255, 135, 0.15));
}

/* 💡 突破漸進超負荷高能發光 Badge 樣式 */
/* 💡 特價傳單風的尖刺黃金突破徽章 */
.spiky-breakthrough-badge {
    position: absolute;
    top: -12px;
    right: -10px;
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #fee440 0%, #ffb703 100%);
    color: #080a10;
    font-size: 0.72rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: -0.02em;
    clip-path: polygon(
        50% 0%, 61% 15%, 80% 10%, 80% 29%, 100% 33%, 
        89% 50%, 100% 67%, 80% 71%, 80% 90%, 61% 85%, 
        50% 100%, 39% 85%, 20% 90%, 20% 71%, 0% 67%, 
        11% 50%, 0% 33%, 20% 29%, 20% 10%, 39% 15%
    );
    z-index: 10;
    transform: rotate(-10deg);
    animation: starburstPulse 1.8s infinite alternate ease-in-out;
    pointer-events: none;
}

@keyframes starburstPulse {
    0% {
        transform: rotate(-12deg) scale(0.96);
        filter: drop-shadow(0 0 5px rgba(254, 228, 64, 0.45));
    }
    100% {
        transform: rotate(-6deg) scale(1.08);
        filter: drop-shadow(0 0 15px rgba(254, 228, 64, 0.75));
    }
}

.minimal-duration-bar {
    animation: fadeIn 0.3s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 1rem;
    border: 1px dashed rgba(0, 240, 255, 0.15);
    border-radius: 10px;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.01);

    .duration-left {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .timer-icon {
            filter: drop-shadow(0 0 3px var(--color-cyan));
        }

        .duration-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-weight: 700;
        }

        .duration-value {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--color-cyan);
            font-family: 'Outfit', 'Inter', sans-serif;
        }
    }

    .duration-right {
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .btn-duration-step {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--text-sub);
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 0.72rem;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                border-color: rgba(255, 255, 255, 0.15);
            }
        }
    }
}

.workout-completed-notice {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.25rem;
    border: 1px solid rgba(255, 183, 3, 0.25) !important;
    background: rgba(255, 183, 3, 0.04) !important;
    border-radius: 12px;
    animation: fadeIn 0.3s ease;
    margin-bottom: 0.5rem;

    .notice-text {
        font-size: 0.85rem;
        color: var(--text-sub);
        font-weight: 700;

        .btn-goto-dashboard {
            color: var(--color-cyan);
            text-decoration: underline;
            font-weight: 800;
            margin: 0 0.25rem;

            &:hover {
                color: #fff;
            }
        }
    }
}
</style>
