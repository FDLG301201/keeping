"use client"

import type React from "react"
import { useState } from "react"
import { Star, X, ArrowLeft, Calendar, ChevronDown, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AddEntryFormProps {
    onSave: (newEntry?: any) => void  // ← Solución: acepta parámetro opcional
    onCancel: () => void
    userId: string
}

export function AddEntryForm({ onSave, onCancel, userId }: AddEntryFormProps) {
    const [formData, setFormData] = useState({
        title: "",
        type: "",
        rating: 0,
        image: "",
        comments: "",
        dateWatched: new Date().toISOString().split("T")[0],
        description: "",
        status: "",
        continuationInfo: {
            totalSeasons: 1,
            currentSeason: 1,
            totalEpisodes: 1,
            currentEpisode: 1,
        },
        genres: [] as string[],
        relatedEntries: [] as string[],
    })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSelectOpen, setIsSelectOpen] = useState(false)
    const [isStatusOpen, setIsStatusOpen] = useState(false)
    const [newGenre, setNewGenre] = useState("")
    const [newRelatedEntry, setNewRelatedEntry] = useState("")

    const supabase = createClient()

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onload = (e) => {
                const result = e.target?.result as string
                setImagePreview(result)
            }
            reader.readAsDataURL(file)
        }
    }

    const uploadImage = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split(".").pop()
            const fileName = `${userId}/${Date.now()}.${fileExt}`

            const { data, error } = await supabase.storage.from("entry-images").upload(fileName, file)

            if (error) throw error

            const {
                data: { publicUrl },
            } = supabase.storage.from("entry-images").getPublicUrl(fileName)

            return publicUrl
        } catch (error) {
            console.error("Error uploading image:", error)
            return null
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.type || formData.rating === 0 || !formData.status) {
            alert("Por favor completa todos los campos requeridos")
            return
        }

        setIsLoading(true)

        try {
            // Upload image if provided
            let imageUrl = null
            if (imageFile) {
                imageUrl = await uploadImage(imageFile)
            }

            // Insert entry
            const { data: entryData, error: entryError } = await supabase
                .from("entries")
                .insert({
                    title: formData.title,
                    type: formData.type,
                    rating: formData.rating,
                    image_url: imageUrl,
                    comments: formData.comments,
                    date_watched: formData.dateWatched,
                    description: formData.description,
                    status: formData.status,
                    seasons: formData.continuationInfo.totalSeasons,
                    current_season: formData.continuationInfo.currentSeason,
                    episodes: formData.continuationInfo.totalEpisodes,
                    current_episode: formData.continuationInfo.currentEpisode,
                    user_id: userId,
                })
                .select()
                .single()

            if (entryError) throw entryError

            // Insert genres
            for (const genreName of formData.genres) {
                // First, ensure genre exists
                const { data: genreData, error: genreError } = await supabase
                    .from("genres")
                    .upsert({ name: genreName }, { onConflict: "name" })
                    .select()
                    .single()

                if (genreError) throw genreError

                // Link entry to genre
                const { error: linkError } = await supabase.from("entry_genres").insert({
                    entry_id: entryData.id,
                    genre_id: genreData.id,
                })

                if (linkError) throw linkError
            }

            // Insert related entries
            for (const relatedTitle of formData.relatedEntries) {
                const { error: relationError } = await supabase.from("entry_relations").insert({
                    entry_id: entryData.id,
                    related_entry_title: relatedTitle,
                })

                if (relationError) throw relationError
            }

            onSave()
        } catch (error) {
            console.error("Error saving entry:", error)
            alert("Error al guardar la entrada. Por favor intenta de nuevo.")
        } finally {
            setIsLoading(false)
        }
    }

    const renderStarRating = () => {
        return (
            <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: i + 1 })}
                        className="transition-colors hover:scale-110"
                    >
                        <Star
                            className={`w-6 h-6 ${i < formData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"
                                }`}
                        />
                    </button>
                ))}
            </div>
        )
    }

    const typeOptions = [
        { value: "anime", label: "Anime" },
        { value: "movie", label: "Película" },
        { value: "series", label: "Serie" },
        { value: "game", label: "Juego" },
        { value: "book", label: "Libro" },
    ]

    const statusOptions = [
        { value: "completed", label: "Completado" },
        { value: "in_progress", label: "En Progreso" },
        { value: "paused", label: "Pausado" },
        { value: "dropped", label: "Abandonado" },
        { value: "not_started", label: "Planeado" },
    ]

    const addGenre = () => {
        if (newGenre.trim() && !formData.genres.includes(newGenre.trim())) {
            setFormData({
                ...formData,
                genres: [...formData.genres, newGenre.trim()],
            })
            setNewGenre("")
        }
    }

    const removeGenre = (genreToRemove: string) => {
        setFormData({
            ...formData,
            genres: formData.genres.filter((genre) => genre !== genreToRemove),
        })
    }

    const addRelatedEntry = () => {
        if (newRelatedEntry.trim() && !formData.relatedEntries.includes(newRelatedEntry.trim())) {
            setFormData({
                ...formData,
                relatedEntries: [...formData.relatedEntries, newRelatedEntry.trim()],
            })
            setNewRelatedEntry("")
        }
    }

    const removeRelatedEntry = (entryToRemove: string) => {
        setFormData({
            ...formData,
            relatedEntries: formData.relatedEntries.filter((entry) => entry !== entryToRemove),
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onCancel}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agregar Nueva Entrada</h1>
                        <p className="text-slate-600 dark:text-slate-400">Registra tu nueva experiencia de entretenimiento</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Información de la Entrada</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Completa los detalles de tu película, serie, anime o juego
                        </p>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Title and Type Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Título *
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        placeholder="Ej: Attack on Titan"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Tipo *
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsSelectOpen(!isSelectOpen)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent flex items-center justify-between"
                                        >
                                            <span className={formData.type ? "text-slate-900 dark:text-white" : "text-slate-500"}>
                                                {formData.type
                                                    ? typeOptions.find((option) => option.value === formData.type)?.label
                                                    : "Selecciona el tipo"}
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        </button>
                                        {isSelectOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg">
                                                {typeOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, type: option.value })
                                                            setIsSelectOpen(false)
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600 first:rounded-t-md last:rounded-b-md"
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description Field */}
                            <div className="space-y-2">
                                <label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Descripción *
                                </label>
                                <textarea
                                    id="description"
                                    placeholder="Describe brevemente de qué trata..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent min-h-[80px] resize-vertical"
                                    rows={3}
                                    required
                                />
                            </div>

                            {/* Status and Rating Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Status Field */}
                                <div className="space-y-2">
                                    <label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Estado *
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent flex items-center justify-between"
                                        >
                                            <span className={formData.status ? "text-slate-900 dark:text-white" : "text-slate-500"}>
                                                {formData.status
                                                    ? statusOptions.find((option) => option.value === formData.status)?.label
                                                    : "Selecciona el estado"}
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        </button>
                                        {isStatusOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg">
                                                {statusOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, status: option.value })
                                                            setIsStatusOpen(false)
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600 first:rounded-t-md last:rounded-b-md"
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Calificación *</label>
                                    <div className="flex items-center gap-2">
                                        {renderStarRating()}
                                        <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                                            {formData.rating > 0 ? `${formData.rating}/5` : "Sin calificar"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Continuation Info Section */}
                            {(formData.type === "Serie" || formData.type === "Anime") && (
                                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Información de Continuación
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                Temporadas Totales
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.continuationInfo.totalSeasons}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        continuationInfo: {
                                                            ...formData.continuationInfo,
                                                            totalSeasons: Number.parseInt(e.target.value) || 1,
                                                        },
                                                    })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Temporada Actual</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={formData.continuationInfo.totalSeasons}
                                                value={formData.continuationInfo.currentSeason}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        continuationInfo: {
                                                            ...formData.continuationInfo,
                                                            currentSeason: Number.parseInt(e.target.value) || 1,
                                                        },
                                                    })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                Episodios Totales
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.continuationInfo.totalEpisodes}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        continuationInfo: {
                                                            ...formData.continuationInfo,
                                                            totalEpisodes: Number.parseInt(e.target.value) || 1,
                                                        },
                                                    })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Episodio Actual</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={formData.continuationInfo.totalEpisodes}
                                                value={formData.continuationInfo.currentEpisode}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        continuationInfo: {
                                                            ...formData.continuationInfo,
                                                            currentEpisode: Number.parseInt(e.target.value) || 1,
                                                        },
                                                    })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Genres Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Géneros</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Agregar género..."
                                        value={newGenre}
                                        onChange={(e) => setNewGenre(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addGenre())}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={addGenre}
                                        className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.genres.map((genre, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm rounded-md"
                                        >
                                            {genre}
                                            <button
                                                type="button"
                                                onClick={() => removeGenre(genre)}
                                                className="text-violet-500 hover:text-violet-700 dark:hover:text-violet-200"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Related Entries Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Entradas Relacionadas</label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Ej: otras temporadas, secuelas, precuelas, etc.
                                </p>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre de entrada relacionada..."
                                        value={newRelatedEntry}
                                        onChange={(e) => setNewRelatedEntry(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRelatedEntry())}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={addRelatedEntry}
                                        className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.relatedEntries.map((entry, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-md"
                                        >
                                            {entry}
                                            <button
                                                type="button"
                                                onClick={() => removeRelatedEntry(entry)}
                                                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <label htmlFor="dateWatched" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Fecha
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        id="dateWatched"
                                        type="date"
                                        value={formData.dateWatched}
                                        onChange={(e) => setFormData({ ...formData, dateWatched: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-2">
                                <label htmlFor="image" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Imagen
                                </label>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <input
                                            id="image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-900 dark:file:text-violet-300"
                                        />
                                    </div>
                                    {imagePreview && (
                                        <div className="relative w-32 h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <img
                                                src={imagePreview || "/placeholder.svg"}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                onClick={() => {
                                                    setImagePreview("")
                                                    setImageFile(null)
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="space-y-2">
                                <label htmlFor="comments" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Comentarios
                                </label>
                                <textarea
                                    id="comments"
                                    placeholder="¿Qué te pareció? Comparte tu opinión..."
                                    value={formData.comments}
                                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent min-h-[100px] resize-vertical"
                                    rows={4}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Guardando..." : "Guardar Entrada"}
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
