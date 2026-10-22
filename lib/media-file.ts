export type SupportedMediaMime =
  | "audio/mpeg"
  | "audio/wav"
  | "image/png"
  | "image/jpeg"

export interface DetectedMediaFile {
  type: "audio" | "image"
  mimeType: SupportedMediaMime
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
