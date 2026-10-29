/** Kỹ năng đang chọn ở trang luyện tập. */
export type PracticeSkill = "reading" | "listening" | "writing"

export const PRACTICE_SKILL_STORAGE_KEY = "ielts:practice-skill"

export const DEFAULT_PRACTICE_SKILL: PracticeSkill = "reading"

function isPracticeSkill(value: unknown): value is PracticeSkill {
  return value === "reading" || value === "listening" || value === "writing"
}

/**
 * Tab kỹ năng đã chọn lần trước.
 *
 * Nhờ giá trị này, học sinh làm xong một bài Listening rồi bấm "Quay lại luyện
 * tập" (link luôn trỏ về `/student/practice`) vẫn thấy tab Listening thay vì bị
 * đẩy về Reading.
 *
 * Trả `null` khi chưa có lựa chọn, storage bị chặn (chế độ riêng tư) hoặc giá
 * trị lưu không hợp lệ.
 */
export function readStoredPracticeSkill(): PracticeSkill | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(PRACTICE_SKILL_STORAGE_KEY)
    return isPracticeSkill(value) ? value : null
  } catch {
    return null
  }
}

/** Ghi nhớ tab kỹ năng; lỗi storage (chặn/đầy) được bỏ qua. */
export function writeStoredPracticeSkill(skill: PracticeSkill): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PRACTICE_SKILL_STORAGE_KEY, skill)
  } catch {
    // Chế độ riêng tư / chặn storage: chỉ mất phần ghi nhớ.
  }
}

/**
 * Theo dõi thay đổi từ tab trình duyệt khác (sự kiện `storage` không bắn trong
 * cùng tab, nên lựa chọn trong tab hiện tại do component tự giữ).
 */
export function subscribePracticeSkill(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

/**
 * Snapshot lúc SSR/hydration: server không đọc được localStorage nên luôn trả
 * `null` (dùng tab mặc định), tránh lệch hydration.
 */
export function getServerPracticeSkill(): PracticeSkill | null {
  return null
}
