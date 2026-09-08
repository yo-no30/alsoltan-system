import { supabase } from '@/lib/supabase'

export const PRODUCT_IMAGES_BUCKET = 'product-images'
export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.'
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return 'حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت.'
  }
  return null
}

export function isValidImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export function buildProductImagePath(productId: string, file: File): string {
  return `${productId}/${Date.now()}.${extensionFor(file.type || 'image/jpeg')}`
}

export function publicUrlForPath(path: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}
