"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Download, ImageIcon, Loader2, MessageCircle, RotateCcw, Share2, Type, X } from "lucide-react"
import { buildShareText } from "@/lib/services/recommend/share-text"
import { canvasToBlob, renderShareCanvas } from "@/lib/services/recommend/share-image"
import {
  IMAGE_FILENAME,
  canCopyImage,
  canShareFiles,
  canShareText,
  copyImage,
  copyText,
  downloadBlob,
  shareNative,
  whatsappUrl,
} from "@/lib/services/recommend/share"
import type { Entry } from "@/lib/types"

interface ShareStepProps {
  entries: Entry[]
  type: string
  onRemove: (id: string) => void
  onRestart: () => void
}

type Rendered =
  | { key: string; canvas: HTMLCanvasElement; file: File; previewUrl: string }
  | { key: string; error: true }

const button =
  "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"

export function ShareStep({ entries, type, onRemove, onRestart }: ShareStepProps) {
  const key = entries.map((e) => e.id).join(",")
  const text = useMemo(() => buildShareText(entries, type), [entries, type])
  const [rendered, setRendered] = useState<Rendered | null>(null)
  const [flash, setFlash] = useState<{ message: string; ok: boolean } | null>(null)
  const [manualCopy, setManualCopy] = useState(false)

  // Re-render the image whenever the list changes. "Loading" is derived
  // (rendered for a different list), so nothing is set synchronously here.
  useEffect(() => {
    if (entries.length === 0) return
    let cancelled = false
    let previewUrl: string | null = null
    ;(async () => {
      try {
        const canvas = await renderShareCanvas(entries, type)
        const blob = await canvasToBlob(canvas, "image/jpeg")
        if (cancelled) return
        previewUrl = URL.createObjectURL(blob)
        const file = new File([blob], IMAGE_FILENAME, { type: "image/jpeg" })
        setRendered({ key, canvas, file, previewUrl })
      } catch (error) {
        console.error("Share image failed:", error)
        if (!cancelled) setRendered({ key, error: true })
      }
    })()
    return () => {
      cancelled = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [entries, type, key])

  const image = rendered?.key === key && !("error" in rendered) ? rendered : null
  const imageFailed = rendered?.key === key && "error" in rendered
  const imageLoading = !image && !imageFailed

  const showFlash = (message: string, ok = true) => {
    setFlash({ message, ok })
    setTimeout(() => setFlash(null), 2000)
  }

  const handleShare = async (withImage: boolean) => {
    const outcome = await shareNative(text, withImage && image ? image.file : undefined)
    if (outcome === "failed") showFlash("No se pudo abrir el menú de compartir", false)
  }

  const handleCopyText = async () => {
    if (await copyText(text)) showFlash("Texto copiado")
    else setManualCopy(true)
  }

  const handleCopyImage = async () => {
    if (!image) return
    if (await copyImage(canvasToBlob(image.canvas, "image/png"))) showFlash("Imagen copiada")
    else showFlash("Tu navegador no dejó copiar la imagen; descárgala", false)
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-slate-600 dark:text-slate-400">No elegiste ninguno para recomendar.</p>
        <button type="button" onClick={onRestart} className={button}>
          <RotateCcw className="w-4 h-4" />
          Volver a los filtros
        </button>
      </div>
    )
  }

  const sharesFiles = image ? canShareFiles(image.file) : false

  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-48">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing for next/image to optimize
          <img src={image.previewUrl} alt="Vista previa de la imagen a compartir" className="w-full h-auto" />
        ) : imageFailed ? (
          <p className="p-6 text-sm text-slate-300 text-center">No pudimos generar la imagen. Puedes compartir el texto.</p>
        ) : (
          <span className="flex items-center gap-2 text-sm text-slate-300 py-16">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparando imagen…
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="truncate">{e.title}</span>
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              aria-label={`Quitar ${e.title}`}
              className="shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {sharesFiles && (
          <button
            type="button"
            onClick={() => handleShare(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        )}
        {canShareText() && (
          <button
            type="button"
            onClick={() => handleShare(false)}
            className={
              sharesFiles
                ? `w-full ${button}`
                : "w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            }
          >
            <Type className="w-4 h-4" />
            {sharesFiles ? "Compartir solo texto" : "Compartir"}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleCopyText} className={button}>
            <Copy className="w-4 h-4" />
            Copiar texto
          </button>
          <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className={button}>
            <MessageCircle className="w-4 h-4" />
            Abrir WhatsApp
          </a>
          <button
            type="button"
            onClick={() => image && downloadBlob(image.file, IMAGE_FILENAME)}
            disabled={!image}
            className={button}
          >
            <Download className="w-4 h-4" />
            Descargar imagen
          </button>
          {canCopyImage() && (
            <button type="button" onClick={handleCopyImage} disabled={!image} className={button}>
              <ImageIcon className="w-4 h-4" />
              Copiar imagen
            </button>
          )}
        </div>
        {imageLoading && <p className="text-xs text-slate-500 dark:text-slate-400">Los botones de imagen se activan en cuanto esté lista.</p>}
      </div>

      {flash && (
        <p
          className={`flex items-center justify-center gap-1 text-sm ${
            flash.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {flash.ok && <Check className="w-4 h-4" />}
          {flash.message}
        </p>
      )}

      {manualCopy && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">No pudimos copiar automáticamente. Selecciónalo y cópialo:</p>
          <textarea
            readOnly
            value={text}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
            rows={8}
            className="w-full p-2 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-slate-800 dark:text-slate-200"
          />
        </div>
      )}

      <button type="button" onClick={onRestart} className="w-full text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
        Empezar de nuevo
      </button>
    </div>
  )
}
