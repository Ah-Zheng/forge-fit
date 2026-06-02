import type { WorkoutDatabase } from '@forge-fit/types'

// 💡 備份檔名定義
const BACKUP_FILE_NAME = 'forge_fit_backup.json'

/**
 * 在 Google Drive 的專屬 appDataFolder (隱藏應用資料夾) 中搜尋已存在的備份檔案
 * @param accessToken Google OAuth 2.0 短效 Access Token
 * @returns 檔案 ID，若不存在則回傳 null
 */
export async function searchBackupFile(accessToken: string): Promise<string | null> {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}'&spaces=appDataFolder`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`搜尋雲端檔案失敗: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        if (data.files && data.files.length > 0) {
            return data.files[0].id
        }
        return null
    } catch (error) {
        console.error('searchBackupFile 發生錯誤:', error)
        throw error
    }
}

/**
 * 將本地資料庫結構打包上傳備份至 Google Drive 隱藏應用區
 * @param accessToken Google OAuth 2.0 短效 Access Token
 * @param dbData 本地資料庫完整資料
 * @returns 備份成功的檔案 ID
 */
export async function uploadBackup(accessToken: string, dbData: WorkoutDatabase): Promise<string> {
    try {
        const existingFileId = await searchBackupFile(accessToken)

        if (existingFileId) {
            // 💡 檔案已存在：使用 PATCH /media 端點直接覆寫備份內容
            const response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dbData)
                }
            )

            if (!response.ok) {
                throw new Error(`更新備份檔案失敗: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.id || existingFileId
        } else {
            // 💡 檔案不存在：使用 POST /multipart 端點建立 metadata 與上傳內容
            const metadata = {
                name: BACKUP_FILE_NAME,
                parents: ['appDataFolder']
            }

            const boundary = 'forge_fit_multipart_boundary'
            const delimiter = `\r\n--${boundary}\r\n`
            const closeDelimiter = `\r\n--${boundary}--`

            const multipartBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(dbData) +
                closeDelimiter

            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartBody
                }
            )

            if (!response.ok) {
                throw new Error(`新建備份檔案失敗: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.id
        }
    } catch (error) {
        console.error('uploadBackup 發生錯誤:', error)
        throw error
    }
}

/**
 * 從 Google Drive 下載已儲存的備份資料庫
 * @param accessToken Google OAuth 2.0 短效 Access Token
 * @returns 雲端的 WorkoutDatabase 資料，若無備份檔案則回傳 null
 */
export async function downloadBackup(accessToken: string): Promise<WorkoutDatabase | null> {
    try {
        const fileId = await searchBackupFile(accessToken)
        if (!fileId) {
            return null // 雲端尚無備份存檔
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        )

        if (!response.ok) {
            throw new Error(`下載備份檔案失敗: ${response.status} ${response.statusText}`)
        }

        const dbData: WorkoutDatabase = await response.json()
        return dbData
    } catch (error) {
        console.error('downloadBackup 發生錯誤:', error)
        throw error
    }
}
