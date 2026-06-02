import type { WorkoutDatabase, WorkoutSession, ExerciseDef, MuscleGroup } from '@forge-fit/types'

/** 本機 LocalStorage 所使用的鍵值 (Key) */
const STORAGE_KEY = 'forge-fit-database-v1'

/** 💡 防禦性 LocalStorage 包裝，提供 100% 強型別且無 any 斷言的安全瀏覽器/Node 相容設計 */
const storage: Storage = typeof window !== 'undefined' ? window.localStorage : {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
}

/** 系統預設的常用器材動作庫，供第一次初始化時注入使用 */
const DEFAULT_EXERCISES: ExerciseDef[] = [
    { id: 'barbell-bench-press', name: '槓鈴平躺臥推', muscle: 'chest' },
    { id: 'dumbbell-incline-press', name: '啞鈴上斜臥推', muscle: 'chest' },
    { id: 'cable-lat-pulldown', name: '滑輪下拉', muscle: 'back' },
    { id: 'barbell-row', name: '槓鈴俯身划船', muscle: 'back' },
    { id: 'barbell-squat', name: '槓鈴深蹲', muscle: 'legs' },
    { id: 'romanian-deadlift', name: '羅馬尼亞硬舉', muscle: 'back' },
    { id: 'dumbbell-lateral-raise', name: '啞鈴側平舉', muscle: 'shoulders' },
    { id: 'dumbbell-bicep-curl', name: '啞鈴雙臂彎舉', muscle: 'arms' }
]

/**
 * 初始化本機資料庫
 * 如果本地沒有任何資料，則會自動注入預設動作庫，並建立一個乾淨的結構。
 * @returns 讀取或初始化後的完整資料庫結構
 */
export function initDatabase(): WorkoutDatabase {
    if (typeof window === 'undefined') {
        // 預防在非瀏覽器環境 (SSR) 下執行時出錯
        return { exercisesLibrary: DEFAULT_EXERCISES, sessions: {} }
    }

    try {
        const rawData = storage.getItem(STORAGE_KEY)
        if (!rawData) {
            // 本地無資料，建立全新的初始資料庫
            const newDb: WorkoutDatabase = {
                exercisesLibrary: DEFAULT_EXERCISES,
                sessions: {}
            }
            saveDatabase(newDb)
            return newDb
        }

        const db: WorkoutDatabase = JSON.parse(rawData)
        // 預防資料結構不完整，確保常用庫至少有預設動作
        if (!db.exercisesLibrary || db.exercisesLibrary.length === 0) {
            db.exercisesLibrary = DEFAULT_EXERCISES
            saveDatabase(db)
        }
        return db
    } catch (error) {
        console.error('初始化本機資料庫失敗，正在重設為預設值。錯誤資訊：', error)
        const fallbackDb: WorkoutDatabase = { exercisesLibrary: DEFAULT_EXERCISES, sessions: {} }
        saveDatabase(fallbackDb)
        return fallbackDb
    }
}

/**
 * 將完整的資料庫結構序列化儲存至 LocalStorage
 * @param db 完整的資料庫結構
 */
export function saveDatabase(db: WorkoutDatabase): void {
    if (typeof window === 'undefined') return
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch (error) {
        console.error('儲存資料至本機資料庫失敗。錯誤資訊：', error)
    }
}

/**
 * 依據日期安全讀取本日的訓練日誌
 * 如果當天尚無紀錄，則會自動回傳一個包含當天日期、動作清單為空的乾淨日誌結構
 * @param date 日期字串，格式為 "YYYY-MM-DD"
 * @returns 單日的訓練日誌結構
 */
export function getWorkoutByDate(date: string): WorkoutSession {
    const db = initDatabase()

    // 若該日期已有日誌，直接回傳
    if (db.sessions[date]) {
        return db.sessions[date]
    }

    // 若無日誌，返回乾淨的空結構
    return {
        date,
        exercises: [],
        duration: 0
    }
}

/**
 * 儲存/更新特定日期的訓練日誌
 * @param date 日期字串，格式為 "YYYY-MM-DD"
 * @param session 單日的訓練日誌結構
 */
export function saveWorkout(date: string, session: WorkoutSession): void {
    const db = initDatabase()
    db.sessions[date] = session
    saveDatabase(db)
}

/**
 * 獲取當前所有的常用器材動作庫清單
 * @returns 動作百科庫陣列
 */
export function getExercisesLibrary(): ExerciseDef[] {
    const db = initDatabase()
    return db.exercisesLibrary
}

/**
 * 新增自訂動作到動作百科庫中
 * @param name 自訂動作名稱 (例如：保加利亞單腿蹲)
 * @param muscle 目標肌群 (例如：legs)
 * @returns 新增成功的動作模板物件
 */
export function addCustomExercise(name: string, muscle: MuscleGroup): ExerciseDef {
    const db = initDatabase()
    const id = `custom-${muscle}-${Date.now()}`
    const newExercise: ExerciseDef = { id, name, muscle }

    // 檢查是否已有相同名稱的動作，避免重複
    const exists = db.exercisesLibrary.some(ex => ex.name.trim() === name.trim())
    if (!exists) {
        db.exercisesLibrary.push(newExercise)
        saveDatabase(db)
    }

    return newExercise
}

/**
 * 獲取所有的重訓歷史日誌清單 (按日期降序排列)
 * @returns 歷史訓練日誌陣列
 */
export function getAllWorkouts(): WorkoutSession[] {
    const db = initDatabase()
    return Object.values(db.sessions)
        .filter(session => session.exercises && session.exercises.length > 0) // 💡 僅返回至少安排了動作的有效歷史日誌
        .sort((a, b) => b.date.localeCompare(a.date)) // 按日期由新到舊排列
}
