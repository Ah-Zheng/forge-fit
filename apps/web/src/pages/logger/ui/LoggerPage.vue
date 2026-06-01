<script setup lang="ts">
import { ClipboardList, AlertCircle, Dumbbell, Trash2, Plus } from 'lucide-vue-next'
// 💡 導入共享的型別定義
import type { WorkoutSession, ExerciseSession } from '@forge-fit/types'
// 💡 導入我們剛剛寫好的共享觸控步進器組件 (FSD 規範下的 shared/ui 層)
import { TactileStepper } from '../../../shared/ui/stepper'

// 💡 宣告接收來自 App.vue 的 Props
const props = defineProps<{
  session: WorkoutSession
}>()

// 1. 刪除整組運動動作的處理邏輯
const handleDeleteExercise = (index: number) => {
  if (confirm('確定要移除此動作與所有組數紀錄嗎？')) {
    // 透過直接突變陣列，App.vue 中的 deep watch 會立即感知並自動存檔 LocalStorage！
    props.session.exercises.splice(index, 1)
  }
}

// 1.5 刪除單一組數的處理邏輯
const handleDeleteSet = (exercise: ExerciseSession, setIdx: number) => {
  exercise.sets.splice(setIdx, 1)
}

// 2. ⚡ 智慧組數記憶 (Smart Set Copier) 邏輯
// 新增組數時，自動複製上一組的重量與次數，免去手動重複調整的麻煩。
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

  // 往組數清單中推進新的一組，並預設勾選為完成狀態
  exercise.sets.push({
    weight: defaultWeight,
    reps: defaultReps,
    completed: true
  })
}

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
  <div class="glass-card" style="animation: fadeInUp 0.4s ease forwards;">
    <!-- 頁頭 -->
    <div class="card-header">
      <div class="card-title-group">
        <ClipboardList class="text-cyan" :size="24" style="filter: drop-shadow(0 0 4px var(--color-cyan));" />
        <h2>本日重量日誌</h2>
      </div>
      <span class="workout-status-badge">鍛鍊中</span>
    </div>

    <!-- 💡 場景 1：本日無紀錄時的空狀態引導 -->
    <div v-if="props.session.exercises.length === 0" class="empty-state-container" style="text-align: center; padding: 4rem 1rem;">
      <AlertCircle class="text-cyan" :size="48" style="margin: 0 auto 1.25rem auto; opacity: 0.8; filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.3));" />
      <h3 style="font-size: 1.15rem; font-weight: 700; color: #FFF; margin-bottom: 0.5rem;">
        今天尚未安排任何動作
      </h3>
      <p style="color: var(--text-sub); font-size: 0.92rem; max-width: 320px; margin: 0 auto; line-height: 1.6;">
        請切換至下方 **「百科」** 分頁，點擊動作右側的 **`+` 按鈕**，即可將常用器材一鍵加入今日重訓日誌！
      </p>
    </div>

    <!-- 💡 場景 2：動態渲染真正的重訓動作日誌卡片與觸控加減按鈕 -->
    <div v-else class="exercises-container" style="margin-top: 1.5rem;">
      <div 
        v-for="(ex, exIdx) in props.session.exercises" 
        :key="ex.exerciseId" 
        class="exercise-block card-glow-blue" 
        style="margin-bottom: 1.5rem; animation: fadeInUp 0.3s ease forwards;"
      >
        <!-- 動作卡片頭部資訊 (包含刪除按鈕) -->
        <div class="exercise-header">
          <div class="exercise-title-area">
            <div class="exercise-icon">
              <Dumbbell :size="16" class="text-cyan" />
            </div>
            <div>
              <h3 class="exercise-name">{{ ex.name }}</h3>
              <span class="badge" :class="getMuscleTagClass(ex.muscle)" style="margin-top: 0.25rem;">
                {{ getMuscleNameZh(ex.muscle) }} ({{ ex.muscle.toUpperCase() }})
              </span>
            </div>
          </div>
          <!-- 刪除動作按鈕 -->
          <button 
            class="btn-icon" 
            @click="handleDeleteExercise(exIdx)" 
            title="移除此動作"
            style="color: var(--text-muted);"
          >
            <Trash2 :size="18" />
          </button>
        </div>

        <!-- 組數紀錄表格區塊 -->
        <div class="set-rows-container" style="margin-top: 1rem;">
          <!-- 表格表頭 -->
          <div class="set-header-row">
            <span class="col-num" style="text-align: center;">組次</span>
            <span class="col-weight" style="text-align: center;">重量 (kg)</span>
            <span class="col-reps" style="text-align: center;">次數 (reps)</span>
            <span class="col-status" style="text-align: center;">完成</span>
            <span class="col-delete" style="text-align: center;"></span>
          </div>

          <!-- 💡 響應式組數迴圈渲染：綁定我們的客製化觸控加減步進器 -->
          <div 
            v-for="(set, setIdx) in ex.sets" 
            :key="setIdx" 
            class="set-row" 
            :class="{ 'active-row': set.completed }"
            style="animation: fadeInUp 0.2s ease forwards;"
          >
            <!-- 組次編號 -->
            <span class="set-num">{{ setIdx + 1 }}</span>
            
            <!-- 🏋️‍♂️ 重量步進器：每點一下加減 2.5 kg -->
            <TactileStepper 
              v-model="set.weight" 
              :step="2.5" 
            />
            
            <!-- 🔢 次數步進器：每點一下加減 1 下 -->
            <TactileStepper 
              v-model="set.reps" 
              :step="1" 
            />
            
            <!-- 核取狀態 Checkbox -->
            <label class="checkbox-container">
              <input 
                type="checkbox" 
                v-model="set.completed" 
              />
              <span class="checkmark"></span>
            </label>

            <!-- 🗑️ 刪除單組按鈕 -->
            <button 
              type="button"
              class="btn-icon delete-set-btn" 
              @click="handleDeleteSet(ex, setIdx)" 
              title="刪除此組"
              style="color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; cursor: pointer;"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- 新增組數按鈕 (智慧組數記憶) -->
        <button 
          class="btn btn-secondary btn-sm" 
          @click="handleAddSet(ex)"
          style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;"
        >
          <Plus :size="14" /> 新增組數
        </button>
      </div>
    </div>
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
</style>
