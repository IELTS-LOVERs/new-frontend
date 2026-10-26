/** #11: client-side image downscale/compression before upload. */

export interface CompressImageOptions {
  /** Longest side in pixels. Defaults to 2048. */
  maxEdge?: number
  /** JPEG quality (0–1). Defaults to 0.82. */
  quality?: number
}

export interface TargetSize {
  width: number
  height: number
  /** Scale applied to the original dimensions (1 = unchanged). */
  scale: number
}

export function isCompressibleImage(mime: string, filename = ""): boolean {
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    /\.(jpe?g|png)$/i.test(filename)
  )
}

/** Fit the image inside `maxEdge` while preserving its aspect ratio. */
export function computeTargetSize(
  width: number,
  height: number,
  maxEdge = 2048
): TargetSize {
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const longest = Math.max(safeWidth, safeHeight)

  if (!Number.isFinite(longest) || longest <= maxEdge) {
    return { width: safeWidth, height: safeHeight, scale: 1 }
  }

  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  }
}

/** Keep the original whenever re-encoding did not actually save bytes. */
export function shouldUseCompressed(
  originalBytes: number,
  compressedBytes: number
): boolean {
  return compressedBytes > 0 && compressedBytes < originalBytes
}

interface LoadedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Safari/older browsers may refuse some formats here; fall back to <img>.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error("Không đọc được hình ảnh"))
      element.src = objectUrl
    })
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
  })
}

/**
 * Resize (longest side ≤ 2048px) and JPEG-encode a photo in the browser.
 * Returns the original file when compression is unavailable, fails, or would
 * make the file larger — uploads must never break because of this helper.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const { maxEdge = 2048, quality = 0.82 } = options

  if (!isCompressibleImage(file.type, file.name)) return file
  if (typeof document === "undefined") return file

  let loaded: LoadedImage | null = null
  try {
    loaded = await loadImage(file)
    const target = computeTargetSize(loaded.width, loaded.height, maxEdge)

    const canvas = document.createElement("canvas")
    canvas.width = target.width
    canvas.height = target.height
    const context = canvas.getContext("2d")
    if (!context) return file

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    // JPEG has no alpha channel: paint white so transparent PNGs stay readable.
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, target.width, target.height)
    context.drawImage(loaded.source, 0, 0, target.width, target.height)

    const blob = await canvasToBlob(canvas, quality)
    if (!blob || !shouldUseCompressed(file.size, blob.size)) return file

    const outputName = /\.png$/i.test(file.name)
      ? file.name.replace(/\.png$/i, ".jpg")
      : file.name

    return new File([blob], outputName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    })
  } catch {
    return file
  } finally {
    loaded?.release()
  }
}
