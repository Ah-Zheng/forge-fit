// forge-fit 共享 TypeScript 型別定義

// 1. 支援的重訓目標肌群
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms';

// 2. 單一組數紀錄
export interface SetRecord {
  weight: number;      // 重量 kg (例如 60, 62.5)
  reps: number;        // 次數 (組內所做的次數/下數)
  completed: boolean;  // 是否已勾選完成
}

// 3. 今日日誌中，某個器材動作的訓練區塊
export interface ExerciseSession {
  exerciseId: string;   // 動作唯一的識別碼 (對應動作百科模板 ID)
  name: string;         // 動作名稱 (例如 "槓鈴平躺臥推")
  muscle: MuscleGroup;  // 目標訓練肌群
  sets: SetRecord[];    // 該動作本日所進行的所有組數清單
}

// 4. 單日的完整訓練日誌
export interface WorkoutSession {
  date: string;                   // 日期字串，格式固定為 "YYYY-MM-DD"
  exercises: ExerciseSession[];   // 本日進行過的所有動作清單
  duration: number;               // 訓練運動總時長 (單位為分鐘，預設 0)
}

// 5. 百科動作庫/常用庫的動作模板
export interface ExerciseDef {
  id: string;           // 動作唯一的識別碼 (例如 "barbell-squat")
  name: string;         // 動作名稱 (例如 "槓鈴深蹲")
  muscle: MuscleGroup;  // 所屬的主訓練肌群
}

// 6. 瀏覽器本機 (LocalStorage) 儲存的完整 JSON 資料庫結構
export interface WorkoutDatabase {
  lastSynced?: string;                      // 上次 Google Drive 雲端同步成功的時間字串 (ISO 格式)
  exercisesLibrary: ExerciseDef[];          // 動作百科庫清單 (包含預設動作與使用者自訂動作)
  sessions: Record<string, WorkoutSession>; // 所有歷史重訓日誌紀錄，以日期 "YYYY-MM-DD" 為 Key 進行映射
}
