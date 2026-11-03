export type UserRole = "student" | "teacher" | "admin"
export type UserStatus = "active" | "inactive" | "suspended"

export interface User {
  id: string
  email: string
  fullName: string
  phone?: string | null
  role: UserRole
  targetBand?: number | null
  status: UserStatus
  avatarMediaId?: string | null
  createdAt?: string
  updatedAt?: string
}

export type SkillType = "listening" | "reading" | "writing"

// === Rich text (ProseMirror/TipTap JSON) ===
export interface RichTextMarkJSON {
  type: string
  attrs?: Record<string, unknown>
}

export interface RichTextNodeJSON {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNodeJSON[]
  marks?: RichTextMarkJSON[]
  text?: string
}

export interface RichDoc {
  type: "doc"
  content?: RichTextNodeJSON[]
}

export interface MediaItem {
  id: string
  url: string
  type: "audio" | "image"
  originalName?: string
  mimeType?: string
  size?: number
}

export interface MediaAsset extends MediaItem {
  uploadedAt: string
  sizeLabel: string
  usageCount: number
  status: "ready" | "pending" | "failed"
}

export interface AntiCheatEvent {
  id?: string
  type:
    | "TAB_SWITCH"
    | "WINDOW_BLUR"
    | "FULLSCREEN_EXIT"
    | "RELOAD"
    | "COPY"
    | "PASTE"
    | "CUT"
    | "CONTEXT_MENU"
    | "INTERRUPTION"
  timestamp?: string
  metadata?: Record<string, unknown>
}
