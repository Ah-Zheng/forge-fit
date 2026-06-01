<script setup lang="ts">
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

// 輔助函式：轉換肌群代號為繁體中文標籤樣式
const getMuscleTagClass = (muscle: string) => {
  switch (muscle) {
    case 'chest': return 'tag-chest'
    case 'back': return 'tag-back'
    case 'legs': return 'tag-legs'
    case 'shoulders': return 'tag-shoulders'
    case 'arms': return 'tag-arms'
    default: return 'tag-chest'
  }
}

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
</script>

<template>
  <div class="glass-card library-quick-card" style="animation: fadeInUp 0.4s ease forwards;">
    <!-- 頁頭 -->
    <div class="card-header">
      <div class="card-title-group">
        <BookOpen class="text-cyan" :size="24" style="filter: drop-shadow(0 0 4px var(--color-cyan));" />
        <h2>常用器材動作庫</h2>
      </div>
    </div>

    <!-- 搜尋欄 (靜態展示) -->
    <div class="search-bar">
      <input type="text" placeholder="搜尋常用動作... (搜尋邏輯待下一步擴充)" readonly style="opacity: 0.6; cursor: not-allowed;">
    </div>

    <!-- 💡 動態動作庫清單：直接讀取來自 packages/core 載入的本機資料庫字典 -->
    <div class="quick-exercise-list">
      <div 
        v-for="ex in props.exercisesLibrary" 
        :key="ex.id" 
        class="quick-lib-item"
      >
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
    </div>
  </div>
</template>

<style scoped>
/* 專屬微調樣式 */
.quick-exercise-list {
  max-height: calc(100vh - 350px);
}
</style>
