import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface DialogOptions {
    title: string
    message: string
    isConfirm: boolean
    confirmText?: string
    cancelText?: string
    type?: 'info' | 'warning' | 'danger' | 'success'
}

export const useDialogStore = defineStore('dialog', () => {
    const isOpen = ref(false)
    const title = ref('')
    const message = ref('')
    const isConfirm = ref(false)
    const confirmText = ref('確定')
    const cancelText = ref('取消')
    const type = ref<'info' | 'warning' | 'danger' | 'success'>('info')

    let resolvePromise: ((val: boolean) => void) | null = null

    // 💡 彈出客製化 Alert 提示框
    const alert = (
        msg: string,
        t = '提示',
        options?: Partial<Omit<DialogOptions, 'title' | 'message' | 'isConfirm'>>
    ): Promise<boolean> => {
        title.value = t
        message.value = msg
        isConfirm.value = false
        confirmText.value = options?.confirmText || '確定'
        type.value = options?.type || 'info'
        isOpen.value = true

        return new Promise((resolve) => {
            resolvePromise = resolve
        })
    }

    // 💡 彈出客製化 Confirm 確認框
    const confirm = (
        msg: string,
        t = '確認',
        options?: Partial<Omit<DialogOptions, 'title' | 'message' | 'isConfirm'>>
    ): Promise<boolean> => {
        title.value = t
        message.value = msg
        isConfirm.value = true
        confirmText.value = options?.confirmText || '確定'
        cancelText.value = options?.cancelText || '取消'
        type.value = options?.type || 'info'
        isOpen.value = true

        return new Promise((resolve) => {
            resolvePromise = resolve
        })
    }

    // 💡 關閉並解決 Promise 狀態
    const close = (status: boolean) => {
        isOpen.value = false
        if (resolvePromise) {
            resolvePromise(status)
            resolvePromise = null
        }
    }

    return {
        isOpen,
        title,
        message,
        isConfirm,
        confirmText,
        cancelText,
        type,
        alert,
        confirm,
        close
    }
})
