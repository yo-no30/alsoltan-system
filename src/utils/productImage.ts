import { supabase } from '@/lib/supabase'

export const PRODUCT_IMAGES_BUCKET = 'product-images'
export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024
/** Longest edge for the uploaded file. */
const MAX_UPLOAD_EDGE = 800

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

function mimeFromFileName(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return null
  return EXTENSION_MIME[ext] ?? null
}

/** Resolve MIME even when Windows leaves `file.type` empty. */
export function resolveImageMime(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type
  const fromName = mimeFromFileName(file.name)
  if (fromName && ALLOWED_TYPES.has(fromName)) return fromName
  return null
}

export function validateProductImage(file: File): string | null {
  if (!resolveImageMime(file)) {
    return 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.'
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return 'حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت.'
  }
  return null
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export function buildProductImagePath(productId: string, file: File): string {
  const mime = resolveImageMime(file) ?? 'image/jpeg'
  return `${productId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(mime)}`
}

export function publicUrlForPath(path: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Extract storage object path from a public product-images URL when possible. */
export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}

function scaledSize(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(sourceWidth, sourceHeight)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
}

export type PreparedProductImage =
  | { ok: true; file: File }
  | { ok: false; message: string }

/**
 * Validates and converts the image to a compressed JPEG for upload.
 * Avoids returning display URLs — in-modal image decode crashes some Windows GPUs.
 */
export async function prepareProductImage(file: File): Promise<PreparedProductImage> {
  const validationError = validateProductImage(file)
  if (validationError) {
    return { ok: false, message: validationError }
  }

  if (!resolveImageMime(file)) {
    return { ok: false, message: 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.' }
  }

  try {
    const bitmap = await createImageBitmap(file)
    const uploadSize = scaledSize(bitmap.width, bitmap.height, MAX_UPLOAD_EDGE)

    const uploadCanvas = document.createElement('canvas')
    uploadCanvas.width = uploadSize.width
    uploadCanvas.height = uploadSize.height
    const uploadContext = uploadCanvas.getContext('2d', { alpha: false })
    if (!uploadContext) {
      bitmap.close()
      // Fallback: keep original file without rasterizing.
      return { ok: true, file }
    }
    uploadContext.fillStyle = '#ffffff'
    uploadContext.fillRect(0, 0, uploadSize.width, uploadSize.height)
    uploadContext.drawImage(bitmap, 0, 0, uploadSize.width, uploadSize.height)
    bitmap.close()

    const blob = await canvasToBlob(uploadCanvas, 0.8)
    uploadCanvas.width = 0
    uploadCanvas.height = 0

    if (!blob || blob.size > MAX_PRODUCT_IMAGE_BYTES) {
      return { ok: true, file }
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'product'
    const prepared = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    return { ok: true, file: prepared }
  } catch (error) {
    console.error('[productImage] prepare failed, using original file:', error)
    return { ok: true, file }
  }
}
