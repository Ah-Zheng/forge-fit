<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle2, HelpCircle } from '@lucide/vue'
import { useDialogStore } from './dialogStore'

const store = useDialogStore()

// 💡 動態載入圖標
const iconComponent = computed(() => {
    switch (store.type) {
        case 'success':
            return CheckCircle2
        case 'danger':
        case 'warning':
            return AlertCircle
        default:
            return HelpCircle
    }
})

// 💡 霓虹發光類別
const iconClass = computed(() => {
    switch (store.type) {
        case 'success':
            return 'text-success glow-success'
        case 'danger':
            return 'text-danger glow-danger'
        case 'warning':
            return 'text-warning glow-warning'
        default:
            return 'text-cyan glow-cyan'
    }
})

const handleConfirm = () => {
    store.close(true)
}

const handleCancel = () => {
    store.close(false)
}
</script>

<template>
    <Teleport to="body">
        <!-- 遮罩層 -->
        <Transition name="fade">
            <div v-if="store.isOpen" class="custom-dialog-overlay" @click="handleCancel"></div>
        </Transition>

        <!-- 對話框本體 -->
        <Transition name="zoom">
            <div v-if="store.isOpen" class="custom-dialog-box glass-card" :class="`type-${store.type}`">
                <div class="dialog-header">
                    <component :is="iconComponent" :size="20" :class="iconClass" />
                    <h3 class="dialog-title">{{ store.title }}</h3>
                </div>
                
                <div class="dialog-body">
                    <p class="dialog-message">{{ store.message }}</p>
                </div>

                <div class="dialog-actions">
                    <button 
                        v-if="store.isConfirm" 
                        class="btn-dialog-action btn-cancel" 
                        @click="handleCancel"
                    >
                        {{ store.cancelText }}
                    </button>
                    <button 
                        class="btn-dialog-action btn-confirm" 
                        :class="`btn-${store.type}`"
                        @click="handleConfirm"
                    >
                        {{ store.confirmText }}
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped lang="scss">
.custom-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(8, 10, 16, 0.75);
    backdrop-filter: blur(5px);
    z-index: 19999;
}

.custom-dialog-box {
    position: fixed;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 360px;
    padding: 1.5rem;
    border-radius: 20px;
    z-index: 20000;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: rgba(18, 22, 36, 0.88) !important;
    backdrop-filter: blur(25px) saturate(180%);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(0, 240, 255, 0.05);
    border: 1px solid rgba(0, 240, 255, 0.25) !important;

    &.type-danger {
        border-color: rgba(255, 74, 74, 0.35) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(255, 74, 74, 0.05);
    }
    &.type-success {
        border-color: rgba(0, 255, 135, 0.35) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(0, 255, 135, 0.05);
    }
    &.type-warning {
        border-color: rgba(251, 188, 5, 0.35) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(251, 188, 5, 0.05);
    }

    .dialog-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .dialog-title {
            font-size: 1.1rem;
            font-weight: 800;
            color: #fff;
            margin: 0;
            letter-spacing: 0.02em;
        }

        .text-cyan { color: var(--color-cyan); }
        .text-success { color: var(--color-success); }
        .text-danger { color: var(--color-danger); }
        .text-warning { color: #fbbc05; }

        .glow-cyan { filter: drop-shadow(0 0 4px var(--color-cyan)); }
        .glow-success { filter: drop-shadow(0 0 4px var(--color-success)); }
        .glow-danger { filter: drop-shadow(0 0 4px var(--color-danger)); }
        .glow-warning { filter: drop-shadow(0 0 4px #fbbc05); }
    }

    .dialog-body {
        .dialog-message {
            font-size: 0.92rem;
            color: var(--text-sub);
            line-height: 1.6;
            margin: 0;
            white-space: pre-wrap;
        }
    }

    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 0.5rem;

        .btn-dialog-action {
            padding: 0.55rem 1.25rem;
            border-radius: 20px;
            font-weight: 800;
            font-size: 0.8rem;
            cursor: pointer;
            border: none;
            transition: all 0.2s;

            &.btn-cancel {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: var(--text-sub);

                &:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                }
            }

            &.btn-confirm {
                background: rgba(0, 240, 255, 0.08);
                border: 1px solid rgba(0, 240, 255, 0.2);
                color: var(--color-cyan);

                &:hover {
                    background: var(--color-cyan);
                    color: #121624;
                    box-shadow: 0 0 8px rgba(0, 240, 255, 0.35);
                }

                &.btn-danger {
                    background: rgba(255, 74, 74, 0.08);
                    border: 1px solid rgba(255, 74, 74, 0.2);
                    color: var(--color-danger);

                    &:hover {
                        background: var(--color-danger);
                        color: #fff;
                        box-shadow: 0 0 8px rgba(255, 74, 74, 0.35);
                    }
                }

                &.btn-success {
                    background: rgba(0, 255, 135, 0.08);
                    border: 1px solid rgba(0, 255, 135, 0.2);
                    color: var(--color-success);

                    &:hover {
                        background: var(--color-success);
                        color: #121624;
                        box-shadow: 0 0 8px rgba(0, 255, 135, 0.35);
                    }
                }
            }
        }
    }
}

/* 💡 動態淡入淡出 / 縮放 */
.fade-enter-active, .fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}

.zoom-enter-active, .zoom-leave-active {
    transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease;
}
.zoom-enter-from, .zoom-leave-to {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0;
}
</style>
