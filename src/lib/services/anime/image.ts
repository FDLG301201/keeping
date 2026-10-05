/**
 * Re-encodes a photo upright and no larger than `maxSide` px.
 * createImageBitmap applies the EXIF orientation, so phone photos stored
 * sideways (orientation 6/8) come out the right way up — OCR and trace.moe
 * would otherwise receive them rotated.
 */
export async function normalizeImage(file: Blob, maxSide: number, quality = 0.9): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", quality),
  )
}
