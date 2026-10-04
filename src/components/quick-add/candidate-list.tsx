"use client"

import NextImage from "next/image"
import type { AnimeCandidate } from "@/lib/services/anime/types"

const FORMAT_LABELS: Record<string, string> = {
  TV: "Serie TV",
  TV_SHORT: "Serie corta",
  MOVIE: "Película",
  Movie: "Película",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "Especial",
  Special: "Especial",
  MUSIC: "Música",
}

interface CandidateListProps {
  candidates: AnimeCandidate[]
  onPick: (candidate: AnimeCandidate) => void
}

export function CandidateList({ candidates, onPick }: CandidateListProps) {
  return (
    <ul className="space-y-2">
      {candidates.map((c) => (
        <li key={`${c.source}-${c.id}`}>
          <button
            type="button"
            onClick={() => onPick(c)}
            className="w-full flex items-center gap-3 p-2 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <NextImage
              src={c.coverUrl || "/placeholder.svg"}
              alt={c.title}
              width={48}
              height={68}
              className="w-12 h-[68px] shrink-0 rounded object-cover bg-slate-200 dark:bg-slate-700"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 dark:text-white line-clamp-2 leading-tight">{c.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {[c.year, c.format && (FORMAT_LABELS[c.format] ?? c.format)].filter(Boolean).join(" · ")}
              </p>
            </div>
            {c.similarity !== undefined && (
              <span
                className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                  c.similarity >= 0.87
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                }`}
              >
                {Math.round(c.similarity * 100)}%
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
