const MAX_DIMENSION = 1200

/**
 * Compress an image file: resize to max 1200px on longest side, convert to WebP.
 * Returns a Blob. Videos pass through unchanged.
 */
export async function compressImage(file) {
  // Skip non-images (videos, etc.)
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // Scale down if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/webp',
        0.85
      )
    }
    img.onerror = () => resolve(file) // fallback to original on error
    img.src = URL.createObjectURL(file)
  })
}
