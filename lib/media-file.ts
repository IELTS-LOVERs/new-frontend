export type SupportedMediaMime =
  | "audio/mpeg"
  | "audio/wav"
  | "image/png"
  | "image/jpeg"

export interface DetectedMediaFile {
  type: "audio" | "image"
  mimeType: SupportedMediaMime
}

/** Human-readable file size used by the media library and picker. */
export function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Upload error that records whether a retry may succeed (network/5xx/429). */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly retryable = false
  ) {
    super(message)
    this.name = "UploadError"
  }
}

/** PUT a file to a presigned URL while reporting progress (0–100). */
export function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else
        reject(
          new UploadError(
            `Tải lên thất bại (HTTP ${xhr.status})`,
            xhr.status >= 500 || xhr.status === 429
          )
        )
    }
    xhr.onerror = () => reject(new UploadError("Lỗi kết nối mạng khi tải lên", true))
    xhr.send(file)
  })
}

/**
 * Browsers report different MIME types for the same extension:
 * e.g. WAV can be `audio/wav`, `audio/x-wav` or `audio/wave`, and some
 * Windows setups report an empty MIME type. Normalise from the extension
 * before calling the presign API, which only accepts the exact values.
 */
export function detectMediaFile(file: File): DetectedMediaFile | null {
  const name = file.name.toLowerCase()
  const mime = (file.type || "").toLowerCase()

  if (name.endsWith(".mp3") || mime === "audio/mpeg" || mime === "audio/mp3") {
    return { type: "audio", mimeType: "audio/mpeg" }
  }
  if (
    name.endsWith(".wav") ||
    mime === "audio/wav" ||
    mime === "audio/x-wav" ||
    mime === "audio/wave"
  ) {
    return { type: "audio", mimeType: "audio/wav" }
  }
  if (name.endsWith(".png") || mime === "image/png") {
    return { type: "image", mimeType: "image/png" }
  }
  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    mime === "image/jpeg" ||
    mime === "image/jpg"
  ) {
    return { type: "image", mimeType: "image/jpeg" }
  }

  return null
}
