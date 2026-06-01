<script setup lang="ts">
// 💡 forge-fit 共享 UI 元件：單手觸控步進器 (TactileStepper)
// 專為健身房單手操作設計，利用 + / - 按鈕調整數值，並設為唯讀以防彈出鍵盤。

// 定義 Props 參數
const props = withDefaults(
  defineProps<{
    modelValue: number // 綁定的數值 (例如重量或次數)
    step: number       // 每次點擊加減的步進值 (例如 2.5 或 1)
    min?: number       // 最小值限制，預設為 0
  }>(),
  {
    min: 0
  }
)

// 定義 v-model 更新事件
const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

// 減少數值的處理函式
const handleMinus = () => {
  const newValue = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
}

// 增加數值的處理函式
const handlePlus = () => {
  const newValue = props.modelValue + props.step
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div class="stepper-input">
    <!-- 減號按鈕 -->
    <button 
      type="button" 
      class="btn-step btn-minus" 
      @click="handleMinus"
    >
      -
    </button>
    
    <!-- 唯讀輸入框 (保證手機上不彈出虛擬鍵盤，維持極致流暢度) -->
    <input 
      type="number" 
      :value="props.modelValue" 
      readonly 
    />
    
    <!-- 加號按鈕 -->
    <button 
      type="button" 
      class="btn-step btn-plus" 
      @click="handlePlus"
    >
      +
    </button>
  </div>
</template>

<style scoped>
/* 步進器組件內部微調，樣式主要繼承全局 style.css 定義 */
.stepper-input {
  user-select: none;
}
</style>
