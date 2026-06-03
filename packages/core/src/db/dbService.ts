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

    // 若該日期已有日誌，進行防禦性結構修復後回傳
    if (db.sessions[date]) {
        const session = db.sessions[date]
        
        // 1. 確保 date 屬性正確
        if (session.date !== date) {
            session.date = date
        }
        
        // 2. 確保 exercises 是陣列，若不是則重置為空陣列
        if (!session.exercises || !Array.isArray(session.exercises)) {
            session.exercises = []
        } else {
            // 3. 確保每個 exercise 的結構都完整
            session.exercises = session.exercises.filter(ex => ex && typeof ex === 'object').map(ex => {
                const cleanEx = { ...ex }
                if (!cleanEx.exerciseId) {
                    cleanEx.exerciseId = `temp-id-${Date.now()}`
                }
                if (!cleanEx.name) {
                    cleanEx.name = '未命名動作'
                }
                if (!cleanEx.muscle) {
                    cleanEx.muscle = 'chest' // 預設安全值
                }
                if (!cleanEx.sets || !Array.isArray(cleanEx.sets)) {
                    cleanEx.sets = []
                } else {
                    cleanEx.sets = cleanEx.sets.filter(s => s && typeof s === 'object').map(s => {
                        let w = typeof s.weight === 'number' && !isNaN(s.weight) ? s.weight : 40
                        let r = typeof s.reps === 'number' && !isNaN(s.reps) ? s.reps : 10
                        let c = typeof s.completed === 'boolean' ? s.completed : false
                        return { weight: w, reps: r, completed: c }
                    })
                }
                return cleanEx
            })
        }

        // 4. 確保計時時長各欄位皆為合法數字，非 NaN
        let duration = typeof session.duration === 'number' && !isNaN(session.duration) ? session.duration : 0
        session.duration = Math.max(0, duration)

        if (session.secondsElapsed !== undefined) {
            let seconds = typeof session.secondsElapsed === 'number' && !isNaN(session.secondsElapsed) ? session.secondsElapsed : 0
            session.secondsElapsed = Math.max(0, seconds)
        }

        if (session.isTimerActive !== undefined) {
            session.isTimerActive = typeof session.isTimerActive === 'boolean' ? session.isTimerActive : false
        }

        if (session.timerStartedAt !== undefined) {
            let startedAt = typeof session.timerStartedAt === 'number' && !isNaN(session.timerStartedAt) ? session.timerStartedAt : undefined
            session.timerStartedAt = startedAt
        }

        return session
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
    if (!session) return
    const db = initDatabase()

    // 防禦性修復 session 內容
    const cleanSession = { ...session }
    
    cleanSession.date = date
    
    if (!cleanSession.exercises || !Array.isArray(cleanSession.exercises)) {
        cleanSession.exercises = []
    } else {
        cleanSession.exercises = cleanSession.exercises.filter(ex => ex && typeof ex === 'object').map(ex => {
            const cleanEx = { ...ex }
            if (!cleanEx.exerciseId) {
                cleanEx.exerciseId = `temp-id-${Date.now()}`
            }
            if (!cleanEx.name) {
                cleanEx.name = '未命名動作'
            }
            if (!cleanEx.muscle) {
                cleanEx.muscle = 'chest'
            }
            if (!cleanEx.sets || !Array.isArray(cleanEx.sets)) {
                cleanEx.sets = []
            } else {
                cleanEx.sets = cleanEx.sets.filter(s => s && typeof s === 'object').map(s => {
                    let w = typeof s.weight === 'number' && !isNaN(s.weight) ? s.weight : 40
                    let r = typeof s.reps === 'number' && !isNaN(s.reps) ? s.reps : 10
                    let c = typeof s.completed === 'boolean' ? s.completed : false
                    return { weight: w, reps: r, completed: c }
                })
            }
            return cleanEx
        })
    }

    let duration = typeof cleanSession.duration === 'number' && !isNaN(cleanSession.duration) ? cleanSession.duration : 0
    cleanSession.duration = Math.max(0, duration)

    if (cleanSession.secondsElapsed !== undefined) {
        let seconds = typeof cleanSession.secondsElapsed === 'number' && !isNaN(cleanSession.secondsElapsed) ? cleanSession.secondsElapsed : 0
        cleanSession.secondsElapsed = Math.max(0, seconds)
    }

    if (cleanSession.isTimerActive !== undefined) {
        cleanSession.isTimerActive = typeof cleanSession.isTimerActive === 'boolean' ? cleanSession.isTimerActive : false
    }

    if (cleanSession.timerStartedAt !== undefined) {
        let startedAt = typeof cleanSession.timerStartedAt === 'number' && !isNaN(cleanSession.timerStartedAt) ? cleanSession.timerStartedAt : undefined
        cleanSession.timerStartedAt = startedAt
    }

    db.sessions[date] = cleanSession
    saveDatabase(db)
}

/**
 * 檢查特定日期是否有訓練紀錄
 * @param date 日期字串，格式為 "YYYY-MM-DD"
 * @returns 是否有至少包含一個動作的紀錄
 */
export function hasWorkoutOnDate(date: string): boolean {
    const db = initDatabase()
    const session = db.sessions[date]
    return !!(session && session.exercises && session.exercises.length > 0)
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

/**
 * 💡 更新常用器材/動作的可承受訓練負荷 (重量與次數)
 * @param exerciseId 動作 ID
 * @param weight 可承受之重量 (kg)
 * @param reps 單組次數 (reps)
 */
export function updateExerciseLoadRecord(exerciseId: string, weight: number, reps: number): void {
    const db = initDatabase()
    const ex = db.exercisesLibrary.find(e => e.id === exerciseId)
    if (ex) {
        ex.targetWeight = weight
        ex.targetReps = reps
        saveDatabase(db)
    }
}

/**
 * 💡 清除常用器材/動作的可承受訓練負荷紀錄
 * @param exerciseId 動作 ID
 */
export function clearExerciseLoadRecord(exerciseId: string): void {
    const db = initDatabase()
    const ex = db.exercisesLibrary.find(e => e.id === exerciseId)
    if (ex) {
        delete ex.targetWeight
        delete ex.targetReps
        saveDatabase(db)
    }
}
