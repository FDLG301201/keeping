"use client"

import type React from "react"
import { useRef, useState } from "react"

export type SwipeDirection = "left" | "right"

const THRESHOLD_PX = 110
const FLING_MS = 260

interface UseSwipeOptions {
  onSwipe: (direction: SwipeDirection) => void
  disabled?: boolean
}

/**
 * Drag-to-swipe for the top card, with mouse and touch alike (Pointer Events).
 * Past the threshold the card flies off and `onSwipe` fires once it's gone;
 * otherwise it springs back. `fling` lets buttons and keys trigger the same exit.
 */
export function useSwipe({ onSwipe, disabled }: UseSwipeOptions) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)

  const fling = (direction: SwipeDirection) => {
    if (leaving || disabled) return
    setDragging(false)
    setLeaving(direction)
    setTimeout(() => {
      onSwipe(direction)
      setLeaving(null)
      setOffset({ x: 0, y: 0 })
    }, FLING_MS)
  }

  const end = () => {
    if (!start.current) return
    start.current = null
    if (Math.abs(offset.x) > THRESHOLD_PX) {
      fling(offset.x > 0 ? "right" : "left")
    } else {
      setDragging(false)
      setOffset({ x: 0, y: 0 })
    }
  }

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (leaving || disabled) return
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY }
      setDragging(true)
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!start.current) return
      setOffset({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
    },
    onPointerUp: end,
    onPointerCancel: end,
  }

  const x = leaving ? (leaving === "right" ? 1 : -1) * 700 : offset.x
  const y = offset.y * 0.3
  const style: React.CSSProperties = {
    transform: `translate(${x}px, ${y}px) rotate(${x / 18}deg)`,
    transition: dragging ? "none" : `transform ${FLING_MS}ms ease-out`,
    touchAction: "none",
  }

  /** -1 (fully "pass") … 0 … 1 (fully "recommend"), for the stamp overlays. */
  const intent = leaving ? (leaving === "right" ? 1 : -1) : Math.max(-1, Math.min(1, offset.x / THRESHOLD_PX))

  return { handlers, style, intent, fling, busy: leaving !== null }
}
