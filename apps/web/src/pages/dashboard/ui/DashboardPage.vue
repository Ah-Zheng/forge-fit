<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Flame, CheckCircle2, TimerReset, HelpCircle, PieChart, X } from 'lucide-vue-next'
// 💡 導入 Chart.js 核心庫 (從 packages 引入)
import Chart from 'chart.js/auto'
// 💡 導入共享的重訊日誌型別定義
import type { WorkoutSession } from '@forge-fit/types'

// 💡 宣告接收來自 App.vue 的 Props
const props = defineProps<{
    session: WorkoutSession
}>()

// 1. 控制「訓練總量科普提示框」的顯示/隱藏狀態
const showVolumeTooltip = ref(false)

// 2. ⚡ 響應式計算：各肌群的今日訓練量加總
// 運作邏輯：依據 completed === true 的組數累加 (重量 × 次數)
const muscleVolumes = computed(() => {
    const volumes = {
        chest: 0,
        back: 0,
        legs: 0,
        shoulders: 0,
        arms: 0
    }

    props.session.exercises.forEach(ex => {
        const m = ex.muscle
        if (volumes[m] !== undefined) {
            ex.sets.forEach(set => {
                if (set.completed) {
                    volumes[m] += set.weight * set.reps
                }
            })
        }
    })

    return volumes
})

// 3. ⚡ 響應式計算：今日總訓練量 (Volume)
const totalVolume = computed(() => {
    return Object.values(muscleVolumes.value).reduce((a, b) => a + b, 0)
})

// 4. ⚡ 響應式計算：今日累計完成組數 (Sets)
const completedSetsCount = computed(() => {
    let sets = 0
    props.session.exercises.forEach(ex => {
        ex.sets.forEach(set => {
            if (set.completed) {
                sets++
            }
        })
    })
    return sets
})

/** 💡 運動時長數值：從 props.session 讀取精確秒數，100% 還原 Garmin/Apple Watch 科技跑錶格式 (00:00) */
const workoutDurationValue = computed(() => {
    const totalSeconds = typeof props.session.secondsElapsed === 'number'
        ? props.session.secondsElapsed
        : (props.session.duration || 0) * 60
    
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hrs > 0) {
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    // 預設與 0 秒狀態皆顯示經典 MM:SS 跑表格式 (00:00)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// ==========================================
// 📊 Chart.js 響應式繪圖邏輯
// ==========================================
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

// 初始化圖表執行函式
const initChartInstance = () => {
    if (!chartCanvas.value) return

    const ctx = chartCanvas.value.getContext('2d')
    if (!ctx) return

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['胸部', '背部', '腿部', '肩膀', '手臂'],
            datasets: [
                {
                    data: [0, 0, 0, 0, 0], // 初始化為 0，後續透過 watch 自動同步
                    backgroundColor: [
                        'rgba(47, 128, 237, 0.85)', // 皇家藍 (胸部)
                        'rgba(0, 240, 255, 0.85)', // 極光青 (背部)
                        'rgba(155, 93, 229, 0.85)', // 紫羅蘭 (腿部)
                        'rgba(241, 91, 181, 0.85)', // 霓虹粉 (肩膀)
                        'rgba(254, 228, 64, 0.85)' // 螢光黃 (手臂)
                    ],
                    borderColor: '#080a10',
                    borderWidth: 3,
                    hoverBorderColor: '#00F0FF',
                    hoverBorderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false }, // 隱藏預設圖例，使用下方精心設計的 HTML 圖例
                tooltip: {
                    enabled: true,
                    backgroundColor: '#121624',
                    titleColor: '#FFF',
                    bodyColor: '#E2E8F0',
                    borderColor: 'rgba(0, 240, 255, 0.2)',
                    borderWidth: 1,
                    padding: 8,
                    callbacks: {
                        label: function (context) {
                            const value = typeof context.raw === 'number' ? context.raw : 0
                            return ` ${context.label}: ${value.toLocaleString()} kg`
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800
            }
        }
    })
}

// 同步圖表數據與重繪
const syncChartData = () => {
    if (chartInstance) {
        const total = totalVolume.value

        if (total === 0) {
            // 💡 今日零訓練量：渲染一個暗白/深藍的 100% 占位圓環，代表尚未有數據，提升 UI 質感
            chartInstance.data.labels = ['尚未有訓練量']
            chartInstance.data.datasets[0].data = [1]
            chartInstance.data.datasets[0].backgroundColor = ['rgba(255, 255, 255, 0.04)']
            chartInstance.data.datasets[0].borderColor = 'rgba(255, 255, 255, 0.08)'
            chartInstance.data.datasets[0].borderWidth = 1
            if (chartInstance.options.plugins && chartInstance.options.plugins.tooltip) {
                chartInstance.options.plugins.tooltip.enabled = false // 💡 零數據時停用互動提示
            }
        } else {
            // 💡 有訓練量：還原彩色霓虹肌群比例與強烈對比邊框
            chartInstance.data.labels = ['胸部', '背部', '腿部', '肩膀', '手臂']
            chartInstance.data.datasets[0].data = [
                muscleVolumes.value.chest,
                muscleVolumes.value.back,
                muscleVolumes.value.legs,
                muscleVolumes.value.shoulders,
                muscleVolumes.value.arms
            ]
            chartInstance.data.datasets[0].backgroundColor = [
                'rgba(47, 128, 237, 0.85)', // 皇家藍 (胸部)
                'rgba(0, 240, 255, 0.85)', // 極光青 (背部)
                'rgba(155, 93, 229, 0.85)', // 紫羅蘭 (腿部)
                'rgba(241, 91, 181, 0.85)', // 霓虹粉 (肩膀)
                'rgba(254, 228, 64, 0.85)' // 螢光黃 (手臂)
            ]
            chartInstance.data.datasets[0].borderColor = '#080a10'
            chartInstance.data.datasets[0].borderWidth = 3
            if (chartInstance.options.plugins && chartInstance.options.plugins.tooltip) {
                chartInstance.options.plugins.tooltip.enabled = true // 💡 有數據時啟用提示
            }
        }
        chartInstance.update()
    }
}

onMounted(() => {
    initChartInstance()
    syncChartData()
})

// ⚡ 深度監聽各肌群訓練量的變更，變動時 Chart.js 自動執行流暢的更新動畫
watch(
    muscleVolumes,
    () => {
        syncChartData()
    },
    { deep: true }
)

// 6. ⚡ 響應式計算：客製化圖例清單 (Legend) 與百分比
const muscleLegendList = computed(() => {
    const total = totalVolume.value
    const muscles = [
        { key: 'chest', label: '胸部', color: 'var(--color-blue)' },
        { key: 'back', label: '背部', color: 'var(--color-cyan)' },
        { key: 'legs', label: '腿部', color: 'var(--color-purple)' },
        { key: 'shoulders', label: '肩膀', color: 'var(--color-magenta)' },
        { key: 'arms', label: '手臂', color: 'var(--color-yellow)' }
    ]

    return muscles.map(m => {
        const vol = muscleVolumes.value[m.key as keyof typeof muscleVolumes.value] || 0
        const pct = total > 0 ? Math.round((vol / total) * 100) : 0
        return {
            ...m,
            vol,
            pct
        }
    })
})
</script>

<template>
    <div class="dashboard-grid" style="animation: fadeInUp 0.4s ease forwards">
        <!-- 1. 今日核心統計數據列 (三大指標卡) -->
        <div class="stats-card-wrapper full-width">
            <!-- 總訓練量卡片 -->
            <div
                class="stat-card"
                :style="{ position: 'relative', zIndex: showVolumeTooltip ? 100 : 1 }"
            >
                <div class="stat-icon-box cyan-glow">
                    <Flame :size="18" />
                </div>
                <div class="stat-data">
                    <!-- 總量數值：加上千分位格式化以利閱讀 -->
                    <div class="stat-value">
                        {{ totalVolume.toLocaleString() }} <span class="unit">kg</span>
                    </div>
                    <!-- 數據標籤與科普問號圖標 -->
                    <div
                        class="stat-label"
                        style="display: flex; align-items: center; gap: 0.25rem"
                    >
                        <span>今日總訓練量</span>
                        <button
                            type="button"
                            class="tooltip-trigger-btn"
                            @click="showVolumeTooltip = !showVolumeTooltip"
                            title="點擊查看訓練量科學原理"
                            style="
                                background: transparent;
                                border: none;
                                padding: 0.2rem;
                                cursor: pointer;
                                color: var(--color-cyan);
                                display: flex;
                                align-items: center;
                            "
                        >
                            <HelpCircle :size="12" style="opacity: 0.8" />
                        </button>
                    </div>
                </div>

                <!-- 數據科普說明書Popover -->
                <div v-if="showVolumeTooltip" class="glass-tooltip-popover">
                    <div class="popover-header">
                        <h4>💡 什麼是「今日總訓練量」？</h4>
                        <button @click="showVolumeTooltip = false" class="btn-close-popover">
                            <X :size="12" />
                        </button>
                    </div>
                    <div class="popover-body">
                        <p class="formula"><strong>計算公式：</strong>重量 × 次數 × 組數</p>
                        <p class="desc">
                            這在健身科學中被稱為<strong>「總負荷量」</strong>，是評估<strong
                                >漸進性超負荷 (Progressive Overload)</strong
                            >
                            最關鍵的指標。只要這個數值隨時間推移穩定上升，就代表你的肌肉在持續進步、變強！
                        </p>
                        <p class="motivation">
                            這也是你今天用雙手與汗水累積舉起的<strong>鋼鐵總重量</strong>，是成就感的具體展現！
                        </p>
                    </div>
                </div>
            </div>

            <!-- 累計組數卡片 -->
            <div class="stat-card">
                <div class="stat-icon-box blue-glow">
                    <CheckCircle2 :size="18" />
                </div>
                <div class="stat-data">
                    <div class="stat-value">
                        {{ completedSetsCount }} <span class="unit">組</span>
                    </div>
                    <div class="stat-label">今日完成組數</div>
                </div>
            </div>

            <!-- 運動時長卡片 -->
            <div class="stat-card">
                <div class="stat-icon-box purple-glow">
                    <TimerReset :size="18" />
                </div>
                <div class="stat-data">
                    <div class="stat-value" style="font-family: 'Outfit', 'Inter', monospace; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;">
                        <span>{{ workoutDurationValue }}</span>
                        <span class="timer-live-badge" :class="{ 'timer-live-active': props.session.isTimerActive }">
                            {{ props.session.isTimerActive ? 'LIVE' : '⏱️' }}
                        </span>
                    </div>
                    <div class="stat-label">運動時長</div>
                </div>
            </div>
        </div>

        <!-- 2. 部位訓練量比例圓餅圖卡片 (Chart.js 動態繪製) -->
        <div class="glass-card chart-card full-width">
            <div class="card-header">
                <div class="card-title-group">
                    <PieChart
                        class="text-cyan"
                        :size="20"
                        style="filter: drop-shadow(0 0 4px var(--color-cyan))"
                    />
                    <h2>部位訓練量比例</h2>
                </div>
            </div>

            <!-- 💡 動態 Doughnut Canvas 渲染區 -->
            <div class="chart-container">
                <canvas ref="chartCanvas"></canvas>

                <!-- 💡 零數據時的中心徽章提示 (空狀態) -->
                <div v-if="totalVolume === 0" class="chart-empty-center-glow">
                    <span class="empty-title">煉鐵中</span>
                    <span class="empty-subtitle">尚無紀錄</span>
                </div>

                <!-- 💡 有數據時的中心訓練量總計 (發光數值) -->
                <div v-else class="chart-active-center-glow">
                    <span class="active-title">
                        {{
                            totalVolume >= 1000
                                ? (totalVolume / 1000).toFixed(1) + 't'
                                : totalVolume + 'kg'
                        }}
                    </span>
                    <span class="active-subtitle">今日總負荷</span>
                </div>
            </div>

            <!-- 💡 響應式客製化發光圖例清單 (動態透明度引導視覺焦點) -->
            <div class="chart-legend-custom" id="chart-legend">
                <div
                    v-for="m in muscleLegendList"
                    :key="m.key"
                    class="legend-item"
                    :style="{
                        opacity: totalVolume === 0 ? 0.5 : m.vol > 0 ? 1 : 0.25,
                        transition: 'opacity 0.3s ease'
                    }"
                >
                    <span
                        class="legend-dot"
                        :style="{ backgroundColor: m.color, boxShadow: `0 0 8px ${m.color}` }"
                    ></span>
                    <span>
                        {{ m.label }}: <strong>{{ m.vol.toLocaleString() }} kg</strong> ({{
                            m.pct
                        }}%)
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 氣泡彈窗 (Popover) 的精緻樣式 */
.glass-tooltip-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 1rem;
    right: 1rem;
    background: linear-gradient(135deg, rgba(20, 26, 46, 0.95) 0%, rgba(13, 17, 30, 0.95) 100%);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 240, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.15);
    border-radius: 12px;
    padding: 1rem;
    z-index: 100;
    animation: fadeInUp 0.25s ease forwards;
}

.popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 0.4rem;
    margin-bottom: 0.5rem;
}

.popover-header h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-cyan);
}

.btn-close-popover {
    background: transparent;
    border: none;
    color: var(--text-sub);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}
.btn-close-popover:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-danger);
}

.popover-body {
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--text-main);
}

.formula {
    background: rgba(8, 10, 16, 0.5);
    padding: 4px 8px;
    border-radius: 6px;
    color: var(--color-cyan);
    margin-bottom: 0.5rem;
    display: inline-block;
}

.desc {
    color: var(--text-main);
    margin-bottom: 0.5rem;
}

.motivation {
    color: var(--text-sub);
    border-left: 2px solid var(--color-cyan);
    padding-left: 6px;
    font-style: italic;
}

.tooltip-trigger-btn:active {
    transform: scale(0.9);
}

/* 📊 圓環正中心絕對定位徽章與發光樣式 */
.chart-empty-center-glow,
.chart-active-center-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none; /* 💡 確保觸控事件穿透至 canvas，不干擾 Chart.js tooltip 觸發 */
    text-align: center;
    user-select: none;
}

.empty-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.03);
}

.empty-subtitle {
    font-size: 0.68rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
    opacity: 0.7;
}

.active-title {
    font-size: 1.35rem;
    font-weight: 900;
    color: var(--color-cyan);
    text-shadow: 0 0 12px rgba(0, 240, 255, 0.45); /* 💡 頂級科技感發光陰影 */
    letter-spacing: -0.02em;
    line-height: 1.1;
}

.active-subtitle {
    font-size: 0.68rem;
    color: var(--text-sub);
    margin-top: 0.15rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    opacity: 0.8;
}

@media (max-width: 768px) {
    .glass-tooltip-popover {
        left: 0.5rem;
        right: 0.5rem;
        width: auto;
    }

    .active-title {
        font-size: 1.2rem; /* 💡 手機版尺寸微調，避免數值溢出圓環 */
    }
}

/* ⏱️ 方案 A 科技跑錶動態發光 LIVE 徽章 */
.timer-live-badge {
    font-size: 0.62rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
    letter-spacing: 0.05em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Inter', sans-serif;
    text-shadow: none;
    line-height: 1.2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.timer-live-badge.timer-live-active {
    background: rgba(0, 240, 255, 0.12) !important;
    border-color: rgba(0, 240, 255, 0.35) !important;
    color: var(--color-cyan) !important;
    text-shadow: 0 0 6px rgba(0, 240, 255, 0.6);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    animation: pulseNeonGlow 2s infinite;
}

@keyframes pulseNeonGlow {
    0% {
        opacity: 0.85;
        box-shadow: 0 0 6px rgba(0, 240, 255, 0.1);
    }
    50% {
        opacity: 1;
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.3);
        filter: drop-shadow(0 0 2px var(--color-cyan));
    }
    100% {
        opacity: 0.85;
        box-shadow: 0 0 6px rgba(0, 240, 255, 0.1);
    }
}
</style>
