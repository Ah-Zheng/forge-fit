/**
 * forge-fit 共享 TypeScript 型別定義
 */

/** 支援的重訓目標肌群 */
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms'

/**
 * 單一組數紀錄
 */
export interface SetRecord {
    /** 重量 kg (例如 60, 62.5) */
    weight: number
    /** 次數 (組內所做的次數/下數) */
    reps: number
    /** 是否已勾選完成 */
    completed: boolean
}

/**
 * 今日日誌中，某個器材動作的訓練區塊
 */
export interface ExerciseSession {
    /** 動作唯一的識別碼 (對應動作百科模板 ID) */
    exerciseId: string
    /** 動作名稱 (例如 "槓鈴平躺臥推") */
    name: string
    /** 目標訓練肌群 */
    muscle: MuscleGroup
    /** 該動作本日所進行的所有組數清單 */
    sets: SetRecord[]
}

/**
 * 單日的完整訓練日誌
 */
export interface WorkoutSession {
    /** 日期字串，格式固定為 "YYYY-MM-DD" */
    date: string
    /** 本日進行過的所有動作清單 */
    exercises: ExerciseSession[]
    /** 訓練運動總時長 (單位為分鐘，預設 0) */
    duration: number
    /** 💡 訓練運動總時長精確秒數 (PWA 秒錶跑秒持久化用) */
    secondsElapsed?: number
    /** 💡 運動秒錶計時器是否處於跑秒運行狀態 */
    isTimerActive?: boolean
    /** 💡 當前這段計時跑秒開始的時間戳記 (用於防禦手機切桌面關螢幕的背景時間補償) */
    timerStartedAt?: number
}

/**
 * 百科動作庫/常用庫的動作模板
 */
export interface ExerciseDef {
    /** 動作唯一的識別碼 (例如 "barbell-squat") */
    id: string
    /** 動作名稱 (例如 "槓鈴深蹲") */
    name: string
    /** 所屬的主訓練肌群 */
    muscle: MuscleGroup
}

/**
 * 瀏覽器本機 (LocalStorage) 儲存的完整 JSON 資料庫結構
 */
export interface WorkoutDatabase {
    /** 上次 Google Drive 雲端同步成功的時間字串 (ISO 格式) */
    lastSynced?: string
    /** 動作百科庫清單 (包含預設動作與使用者自訂動作) */
    exercisesLibrary: ExerciseDef[]
    /** 所有歷史重訓日誌紀錄，以日期 "YYYY-MM-DD" 為 Key 進行映射 */
    sessions: Record<string, WorkoutSession>
}
