<script setup lang="ts">
import { onUnmounted } from 'vue'

// 💡 forge-fit 共享 UI 元件：單手觸控步進器 (TactileStepper)
// 專為健身房單手操作設計，支援 Pointer 長按連續增減（防手汗、免彈出鍵盤，極致順暢）

// 定義 Props 參數
const props = withDefaults(
    defineProps<{
        modelValue: number // 綁定的數值 (例如重量或次數)
        step: number // 每次點擊加減的步進值 (例如 2.5 或 1)
        min?: number // 最小值限制，預設為 0
        disabled?: boolean // 是否禁用步進器
    }>(),
    {
        min: 0,
        disabled: false
    }
)

// 定義 v-model 更新事件
const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void
}>()

// 長按計時器計量
let timeoutId: number | null = null
let intervalId: number | null = null

// 減少數值的處理函式
const handleMinus = () => {
    if (props.disabled) return
    const newValue = Math.max(props.min, props.modelValue - props.step)
    // 💡 處理浮點數加減的誤差精度 (特別是 2.5kg 的小數點後一位)
    const fixedValue = parseFloat(newValue.toFixed(1))
    emit('update:modelValue', fixedValue)
}

// 增加數值的處理函式
const handlePlus = () => {
    if (props.disabled) return
    const newValue = props.modelValue + props.step
    const fixedValue = parseFloat(newValue.toFixed(1))
    emit('update:modelValue', fixedValue)
}

// 💡 PointerDown 觸發：開始計時長按步進
const startStepping = (isAdd: boolean) => {
    if (props.disabled) return
    // 執行第一次的單點更新
    if (isAdd) {
        handlePlus()
    } else {
        handleMinus()
    }

    // 清空防手震的計時器
    clearTimers()

    // 400ms 後若未放開，開啟每 80ms 一次的高速連續跳動
    timeoutId = window.setTimeout(() => {
        intervalId = window.setInterval(() => {
            if (props.disabled) {
                clearTimers()
                return
            }
            if (isAdd) {
                handlePlus()
            } else {
                handleMinus()
            }
        }, 80)
    }, 400)
}

// 💡 PointerUp / PointerLeave 觸發：停止步進
const stopStepping = () => {
    clearTimers()
}

const clearTimers = () => {
    if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
    }
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
    }
}

onUnmounted(() => {
    clearTimers()
})
</script>

<template>
    <div class="stepper-input" :class="{ 'is-disabled': props.disabled }">
        <!-- 減號按鈕 -->
        <button
            type="button"
            class="btn-step btn-minus"
            :disabled="props.disabled"
            @pointerdown.prevent="startStepping(false)"
            @pointerup="stopStepping"
            @pointerleave="stopStepping"
            title="長按可連續減少"
        >
            -
        </button>

        <!-- 唯讀輸入框 (保證手機上不彈出虛擬鍵盤，維持極致流暢度) -->
        <input type="number" :value="props.modelValue" readonly :disabled="props.disabled" />

        <!-- 加號按鈕 -->
        <button
            type="button"
            class="btn-step btn-plus"
            :disabled="props.disabled"
            @pointerdown.prevent="startStepping(true)"
            @pointerup="stopStepping"
            @pointerleave="stopStepping"
            title="長按可連續增加"
        >
            +
        </button>
    </div>
</template>

<style scoped>
/* 💡 微調組件內的極致科技霓虹樣式 */
.stepper-input {
    display: flex;
    align-items: center;
    background: rgba(8, 10, 16, 0.4);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 2px;
    user-select: none;
    transition: all 0.2s ease;
    max-width: 130px;
    height: 38px;
}

.stepper-input.is-disabled {
    opacity: 0.45;
    pointer-events: none;
    cursor: not-allowed;
}

.stepper-input:focus-within,
.stepper-input:hover {
    border-color: rgba(0, 240, 255, 0.4);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.1);
}

.stepper-input.is-disabled:hover {
    border-color: var(--border-soft);
    box-shadow: none;
}

.btn-step {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: var(--text-sub);
    font-size: 1.15rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    touch-action: manipulation;
}

.btn-step:disabled {
    cursor: not-allowed;
    pointer-events: none;
}

.btn-step:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.15);
}

/* 減號觸控發紅光 */
.btn-minus:active {
    background: rgba(255, 74, 74, 0.15) !important;
    border-color: var(--color-danger) !important;
    color: var(--color-danger) !important;
    box-shadow: 0 0 8px rgba(255, 74, 74, 0.4);
    transform: scale(0.92);
}

/* 加號觸控發青光 */
.btn-plus:active {
    background: rgba(0, 240, 255, 0.15) !important;
    border-color: var(--color-cyan) !important;
    color: var(--color-cyan) !important;
    box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
    transform: scale(0.92);
}

input {
    width: 50px;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
    text-align: center;
    outline: none;
    user-select: none;
    -pointer-events: none;
}

/* 隱藏原生 Chrome / Safari 步進器箭頭 */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
</style>
