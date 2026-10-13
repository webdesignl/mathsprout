/** Photo helpers for the Tutor: shrink a picture in the browser before it is uploaded. */

export const MAX_EDGE = 1568
export const JPEG_QUALITY = 0.8

/** The size a picture should be so its longer side is at most `maxEdge`. Never makes a picture bigger. */
export function fitWithin(width: number, height: number, maxEdge: number = MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 }
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) }
  const scale = maxEdge / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Base64 for bytes, in chunks so big pictures don't overflow the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function loadBitmap(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    // "from-image" turns phone photos the right way up.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { source: image, width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface ResizedPhoto {
  imageBase64: string
  mediaType: 'image/jpeg'
}

/** Shrinks a photo to at most 1568px on its long edge and saves it as a JPEG at quality 0.8. */
export async function resizePhoto(file: Blob): Promise<ResizedPhoto> {
  const { source, width, height } = await loadBitmap(file)
  const size = fitWithin(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot resize pictures.')
  // A white background, so a see-through PNG doesn't turn black as a JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.drawImage(source, 0, 0, size.width, size.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('This browser could not save the picture.')
  return { imageBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())), mediaType: 'image/jpeg' }
}
