'use client'

const WINDOW_MS = 10 * 60 * 1000 // 10分
const MAX_PER_WINDOW = 10
const STORAGE_KEY = 'report-timestamps'

function getRecent(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all: number[] = raw ? (JSON.parse(raw) as number[]) : []
    const cutoff = Date.now() - WINDOW_MS
    return all.filter((ts) => ts > cutoff)
  } catch {
    return []
  }
}

/** 現在レート制限中かどうかを返す。localStorage が使えない環境では常に通過。 */
export function checkClientRateLimit(): { limited: boolean; minutesUntilFree: number } {
  const recent = getRecent()
  if (recent.length < MAX_PER_WINDOW) return { limited: false, minutesUntilFree: 0 }
  // 最も古いタイムスタンプが expire する時刻にスロットが空く
  const oldest = Math.min(...recent)
  const minutesUntilFree = Math.ceil((oldest + WINDOW_MS - Date.now()) / 60000)
  return { limited: true, minutesUntilFree: Math.max(1, minutesUntilFree) }
}

/** 送信成功時に呼び出してタイムスタンプを記録する。 */
export function recordClientSubmission(): void {
  try {
    const recent = getRecent()
    recent.push(Date.now())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
  } catch {}
}
