<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '../../../entities/workout'
import { PlusCircle, Scale, Edit3, Check } from '@lucide/vue'
// 💡 導入我們在 packages/core 中實作的常用負荷更新服務
import { updateExerciseLoadRecord } from '@forge-fit/core'
// 💡 導入共享的型別定義
import type { ExerciseDef } from '@forge-fit/types'
// 💡 導入共享的觸控步進器元件 (FSD 規範下的 shared/ui 層)
import { TactileStepper } from '../../../shared/ui/stepper'

const store = useWorkoutStore()
const router = useRouter()
const { exercisesLibrary, todaySession } = storeToRefs(store)

// 💡 用 reactive 模擬 props 物件，達成 100% 模板相容
const props = reactive({
    exercisesLibrary,
    session: todaySession
})

// 💡 自定義 emit 方法模擬器，將事件引流至 Pinia Store 與 Vue Router
const emit = (event: string, ...args: any[]) => {
    if (event === 'addExercise') {
        const [exercise] = args
        // 💡 呼叫 store 的 action 來將動作加入今日日誌
        store.addExerciseToToday(exercise)
        router.push('/logger')
    } else if (event === 'refreshLibrary') {
        store.refreshLibrary()
    } else if (event === 'switchTab') {
        const [tab, date] = args
        router.push(`/${tab}`)
        if (date) {
            store.workoutDate = date
        }
    } else if (event === 'changeDate') {
        const [date] = args
        store.workoutDate = date
    }
}



// 💡 分類選單狀態管理與定義
const selectedCategory = ref<string>('all')

const categories = [
    { key: 'all', name: '全部' },
    { key: 'chest', name: '胸部' },
    { key: 'back', name: '背部' },
    { key: 'legs', name: '腿部' },
    { key: 'shoulders', name: '肩膀' },
    { key: 'arms', name: '手臂' }
]

const selectCategory = (categoryKey: string) => {
    selectedCategory.value = categoryKey
}

// 💡 響應式計算篩選後的動作庫列表
const filteredExercises = computed(() => {
    if (selectedCategory.value === 'all') {
        return props.exercisesLibrary
    }
    return props.exercisesLibrary.filter(ex => ex.muscle === selectedCategory.value)
})

// 輔助函式：轉換肌群代號為繁體中文標籤樣式
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

// ==========================================
// 💡 常用可承受負荷 (重量與次數) 編輯狀態與儲存邏輯
// ==========================================
const editingExerciseId = ref<string | null>(null)
const tempWeight = ref(40)
const tempReps = ref(10)

// 開啟某個器材動作的常用負荷編輯面板
const startEditingLoad = (ex: ExerciseDef) => {
    // 💡 健檢細節：如果已經在編輯該項目，再次點擊即為關閉
    if (editingExerciseId.value === ex.id) {
        editingExerciseId.value = null
        return
    }

    editingExerciseId.value = ex.id
    tempWeight.value = ex.targetWeight !== undefined ? ex.targetWeight : 40
    tempReps.value = ex.targetReps !== undefined ? ex.targetReps : 10
}

// 儲存常用負荷紀錄至本地資料庫並更新畫面
const saveLoadRecord = (exerciseId: string) => {
    updateExerciseLoadRecord(exerciseId, tempWeight.value, tempReps.value)

    // 💡 響應式事件連動：通知 App.vue 重載常用動作庫，畫面隨即自動更新
    emit('refreshLibrary')

    editingExerciseId.value = null
}
</script>

<template>
    <div class="library-page-wrapper" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 💡 左欄：搜尋與篩選 (PC端為垂直面板) -->
        <div class="library-left-column">
            <!-- 搜尋欄 (靜態展示) -->
            <div class="search-bar">
                <input
                    type="text"
                    placeholder="搜尋常用動作... (搜尋邏輯待下一步擴充)"
                    readonly
                    style="opacity: 0.6; cursor: not-allowed"
                />
            </div>

            <!-- 💡 快速分類篩選按鈕群 (橫向滾動) -->
            <div class="filter-container">
                <button
                    v-for="cat in categories"
                    :key="cat.key"
                    class="filter-btn"
                    :class="{ active: selectedCategory === cat.key }"
                    @click="selectCategory(cat.key)"
                >
                    {{ cat.name }}
                </button>
            </div>
        </div>

        <!-- 💡 右欄：常用器材動作清單 -->
        <div class="library-right-column">
            <!-- 💡 動態動作庫清單：直接讀取來自 packages/core 載入的本機資料庫字典，並支援即時篩選 -->
            <div class="quick-exercise-list">
                <div
                    v-for="ex in filteredExercises"
                    :key="ex.id"
                    class="lib-card"
                >
                    <div class="lib-item-row" :class="{ 'is-editing': editingExerciseId === ex.id }">
                        <div class="item-info">
                            <div class="item-name">{{ ex.name }}</div>
                            <div class="item-meta-row">
                                <span class="badge" :class="getMuscleTagClass(ex.muscle)">
                                    {{ getMuscleNameZh(ex.muscle) }} ({{ ex.muscle.toUpperCase() }})
                                </span>

                                <!-- 💡 常用負荷狀態小卡 (發光霓虹青) -->
                                <span v-if="ex.targetWeight !== undefined" class="load-record-display">
                                    <Scale :size="13" class="text-cyan" />
                                    <span class="highlight-cyan">{{ ex.targetWeight }} kg × {{ ex.targetReps }} 下</span>
                                </span>
                                <span v-else class="load-record-display load-empty">
                                    <Scale :size="13" /> 尚未設定適應重量
                                </span>
                            </div>
                        </div>

                        <div class="item-actions">
                            <!-- 編輯常用負荷按鈕 -->
                            <button
                                class="btn-edit-load"
                                :class="{ active: editingExerciseId === ex.id }"
                                @click="startEditingLoad(ex)"
                                title="設定或修改常用可承受重量"
                            >
                                <Edit3 :size="18" />
                            </button>

                            <!-- 一鍵加入今日日誌按鈕 -->
                            <button
                                class="btn-quick-add"
                                @click="emit('addExercise', ex)"
                                title="將此動作加入今日重訓日誌"
                            >
                                <PlusCircle :size="26" />
                            </button>
                        </div>
                    </div>

                    <!-- 💡 就地滑出/展開的常用負荷觸控步進器調整面板 -->
                    <div
                        v-if="editingExerciseId === ex.id"
                        class="glass-edit-panel"
                        style="animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                    >
                        <div class="panel-steppers">
                            <div class="stepper-group">
                                <span class="stepper-label">常用重量</span>
                                <TactileStepper v-model="tempWeight" :step="2.5" />
                            </div>
                            <div class="stepper-group">
                                <span class="stepper-label">每組下數</span>
                                <TactileStepper v-model="tempReps" :step="1" :min="1" />
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm save-load-btn" @click="saveLoadRecord(ex.id)">
                            <Check :size="14" />
                            <span>儲存</span>
                        </button>
                    </div>
                </div>

                <!-- 篩選後無資料之缺省提示 -->
                <div
                    v-if="filteredExercises.length === 0"
                    class="no-data-hint"
                    style="text-align: center; padding: 2rem 0; color: var(--text-sub)"
                >
                    此分類暫無動作項目
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 專屬微調樣式 */
.library-page-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    gap: 1rem;
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

.quick-exercise-list {
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 4px;
}

.search-bar {
    flex-shrink: 0;
}

.filter-container {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    flex-shrink: 0;
}
.filter-container::-webkit-scrollbar {
    display: none; /* Safari & Chrome */
}

.filter-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-soft);
    color: var(--text-sub);
    padding: 0.35rem 0.9rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
}

.filter-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
}

.filter-btn.active {
    background: rgba(0, 240, 255, 0.1);
    border-color: var(--color-cyan);
    color: var(--color-cyan);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
}

/* 💡 常用負荷列表項目容器與過渡樣式 */
.lib-card {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
    border: 1px solid var(--border-soft);
    background: rgba(18, 22, 36, 0.35); /* 💡 稍微調亮卡片背景 */
    border-radius: 14px;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-card);
    flex-shrink: 0;                    /* 💡 健檢優化：防止在 Flex 容器中因高度超限而被意外壓縮變扁 */
}

.lib-card:hover {
    border-color: rgba(0, 240, 255, 0.25); /* 💡 懸停時亮起青色微光 */
    box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.05);
    background: rgba(18, 22, 36, 0.45);
}

.lib-item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.75rem;          /* 💡 PC 桌機端：加大且寬裕大氣的 padding */
    transition: all 0.25s ease;
    width: 100%;
}

.lib-item-row.is-editing {
    background: rgba(0, 240, 255, 0.03);
    border-bottom: 1px dashed rgba(0, 240, 255, 0.15);
}

/* 💡 排版優化：防止字數過長擠扁右側按鈕 */
.item-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;                       /* 💡 PC 桌機端：間距拉開，視覺更寬適 */
    flex: 1;
    min-width: 0;
    margin-right: 1.5rem;
}

.item-name {
    font-size: 1.25rem;                /* 💡 PC 桌機端：超大字型，氣勢十足 */
    font-weight: 800;                  /* 💡 PC 桌機端：加粗 */
    color: #FFF;
    word-break: break-word;            /* 💡 長名稱自動換行，絕不擠扁操作區 */
    line-height: 1.35;
}

.item-meta-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
    flex-wrap: wrap;
}

/* PC 端肌群標籤字型放大 */
.item-meta-row .badge {
    font-size: 0.75rem;
    padding: 2px 8px;
}

/* 常用負荷發光指示牌 (PC 端大尺寸) */
.load-record-display {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;                /* 💡 PC 桌機端：常用負荷卡片字型放大 */
    font-weight: 700;
    color: var(--text-sub);
    background: rgba(255, 255, 255, 0.04);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.load-record-display svg {
    opacity: 0.85;
}

.highlight-cyan {
    color: var(--color-cyan);
    text-shadow: 0 0 10px rgba(0, 240, 255, 0.55);
}

.load-empty {
    opacity: 0.4;
    font-style: italic;
    font-weight: 500;
}

.item-actions {
    display: flex;
    align-items: center;
    gap: 1rem;                         /* 💡 PC 桌機端：按鈕間距加寬 */
}

/* 編輯常用負荷按鈕 */
.btn-edit-load {
    background: transparent;
    border: none;
    color: var(--text-sub);
    cursor: pointer;
    padding: 10px;                     /* 💡 PC 桌機端：點擊感厚實 */
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: all 0.2s ease;
}

.btn-edit-load:hover {
    color: #FFF;
    background: rgba(255, 255, 255, 0.08);
}

.btn-edit-load.active {
    color: var(--color-cyan);
    background: rgba(0, 240, 255, 0.12);
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
}

.btn-quick-add {
    color: var(--color-cyan);
    transition: all 0.2s ease;
}
.btn-quick-add:hover {
    color: #FFF;
    filter: drop-shadow(0 0 8px var(--color-cyan));
    transform: scale(1.08);
}

/* 💡 就地滑出的毛玻璃科技風編輯面板 (PC 端大尺寸) */
.glass-edit-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(8, 10, 16, 0.55);
    backdrop-filter: blur(15px);
    padding: 1rem 1.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    gap: 2rem;
}

.panel-steppers {
    display: flex;
    gap: 2rem;
    flex-grow: 1;
}

.stepper-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
}

.stepper-label {
    font-size: 0.8rem;                 /* 💡 PC 桌機端：指示文字放大 */
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.save-load-btn {
    align-self: flex-end;
    height: 42px;                      /* 💡 PC 桌機端：按鈕高度增加 */
    padding: 0 2rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.35);
}

/* 展開動畫 */
@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 📱 手機網頁版/PWA 窄螢幕斷點適配 (max-width: 768px) */
@media (max-width: 768px) {
    .quick-exercise-list {
        max-height: none !important;    /* 💡 手機版：取消局部滾動高度限制，由整頁統一承載滑動，徹底防範任何高度擠壓 */
    }

    .lib-card {
        margin-bottom: 0.75rem;
        border-radius: 12px;
    }

    .lib-item-row {
        padding: 0.85rem 1rem;          /* 💡 手機版：採用緊湊美觀的微間距，防擠壓 */
    }

    .item-info {
        gap: 0.25rem;
        margin-right: 0.5rem;
    }

    .item-name {
        font-size: 0.95rem;             /* 💡 手機版：動作名尺寸微調，100% 絕不跑版 */
        font-weight: 700;
    }

    .item-meta-row {
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    .item-meta-row .badge {
        font-size: 0.65rem;
        padding: 1px 6px;
    }

    .load-record-display {
        font-size: 0.68rem;             /* 💡 手機版：維持小字，保持整齊 */
        padding: 2px 8px;
    }

    .glass-edit-panel {
        flex-direction: column;         /* 💡 手機版：垂直面板堆疊 */
        align-items: stretch;
        padding: 0.75rem 0.9rem;
        gap: 0.85rem;
    }

    .panel-steppers {
        flex-direction: column;         /* 💡 手機版：步進器垂直堆疊，100% 消除橫向擠壓跑版 */
        gap: 0.65rem;
        width: 100%;
    }

    .stepper-group {
        flex-direction: row;            /* 💡 手機版：左側字，右側步進器，極致齊整對稱 */
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 1rem;
    }

    .stepper-label {
        font-size: 0.7rem;
        margin-bottom: 0;
    }

    .save-load-btn {
        width: 100%;                    /* 💡 手機版：按鈕拉滿 100%，大拇指極易點擊 */
        justify-content: center;
        align-self: stretch;
        margin-top: 0.25rem;
        height: 38px;
    }

    .item-actions {
        gap: 0.65rem;
    }

    .btn-edit-load {
        padding: 6px;
    }
}

/* 📱 手機與行動端預設排版 */
.library-left-column {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 1rem;
}

.library-right-column {
    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

/* 🖥️ PC 大螢幕左右雙欄響應式佈局 (min-width: 1024px) */
@media (min-width: 1024px) {
    .library-page-wrapper {
        display: grid !important;
        grid-template-columns: 30% 1fr !important;
        gap: 1.5rem !important;
        max-width: 100% !important;
        margin: 0;
        align-items: start;
        height: 100%;
    }

    .library-left-column {
        position: sticky;
        top: 1rem;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .library-right-column {
        min-width: 0;
    }

    /* 💡 PC端自適應優化：動作百科清單在寬螢幕下改為雙欄格線排版，美觀且高效利用空間 */
    .quick-exercise-list {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)) !important;
        gap: 1.25rem !important;
        padding-right: 8px !important;
    }

    .lib-card {
        margin-bottom: 0 !important; /* ➔ 由格線間距接管上下間隔 */
    }

    .filter-container {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 0.75rem !important;
        overflow-x: visible !important;
        padding-bottom: 0 !important;
        margin-bottom: 0 !important;
    }

    .filter-btn {
        width: 100% !important;
        text-align: left !important;
        padding: 0.75rem 1.25rem !important;
        border-radius: 12px !important;
        font-size: 0.95rem !important;
    }
}
</style>
