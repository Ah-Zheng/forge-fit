<script setup lang="ts">
import { ref, computed } from 'vue'
import { BookOpen, PlusCircle } from 'lucide-vue-next'
// 💡 導入共享的型別定義
import type { ExerciseDef } from '@forge-fit/types'

// 💡 宣告接收來自 App.vue 的 Props
const props = defineProps<{
    exercisesLibrary: ExerciseDef[]
}>()

// 💡 宣告觸發給 App.vue 的事件 (一鍵加動作)
const emit = defineEmits<{
    (e: 'addExercise', exercise: ExerciseDef): void
}>()

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
</script>

<template>
    <div class="glass-card library-quick-card" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 頁頭 -->
        <div class="card-header">
            <div class="card-title-group">
                <BookOpen
                    class="text-cyan"
                    :size="24"
                    style="filter: drop-shadow(0 0 4px var(--color-cyan))"
                />
                <h2>常用器材動作庫</h2>
            </div>
        </div>

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

        <!-- 💡 動態動作庫清單：直接讀取來自 packages/core 載入的本機資料庫字典，並支援即時篩選 -->
        <div class="quick-exercise-list">
            <div v-for="ex in filteredExercises" :key="ex.id" class="quick-lib-item">
                <div class="item-info">
                    <div class="item-name">{{ ex.name }}</div>
                    <span class="badge" :class="getMuscleTagClass(ex.muscle)">
                        {{ getMuscleNameZh(ex.muscle) }} ({{ ex.muscle.toUpperCase() }})
                    </span>
                </div>

                <!-- 一鍵加入今日日誌按鈕 -->
                <button
                    class="btn-quick-add"
                    @click="emit('addExercise', ex)"
                    title="將此動作加入今日重訓日誌"
                >
                    <PlusCircle :size="22" />
                </button>
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
</template>

<style scoped>
/* 專屬微調樣式 */
.quick-exercise-list {
    max-height: calc(100vh - 410px);
}

.filter-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scrollbar-width: none; /* Firefox */
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
</style>
