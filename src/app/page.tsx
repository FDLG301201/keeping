"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Star, Plus, Search, LogOut, User, Filter, Eye, Clock, Pause, X, Play, ChevronDown } from "lucide-react"
import { AddEntryForm } from "@/components/forms/add-entry-form"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface EntryType {
  id: number
  title: string
  type: string
  rating: number
  image_url: string
  comments: string
  date_watched: string
  description: string
  status: string
  total_seasons: number
  current_season: number
  total_episodes: number
  current_episode: number
  genres: string[]
  related_entries: string[]
  user_id: string
  created_at: string
}

// const typeColors = {
//   Anime: "bg-pink-500",
//   Película: "bg-blue-500",
//   Serie: "bg-green-500",
//   Juego: "bg-purple-500",
// }

const typeColors = {
  anime: "bg-pink-500",
  movie: "bg-blue-500",
  series: "bg-green-500",
  game: "bg-purple-500",
  book: "bg-gray-500",
}

// const statusConfig = {
//   Completado: { color: "bg-green-500", icon: Eye },
//   "En Progreso": { color: "bg-blue-500", icon: Play },
//   Pausado: { color: "bg-yellow-500", icon: Pause },
//   Abandonado: { color: "bg-red-500", icon: X },
//   Planeado: { color: "bg-gray-500", icon: Clock },
// }

const statusConfig = {
  not_started: { color: "bg-gray-500", icon: Clock },
  in_progress: { color: "bg-blue-500", icon: Play },
  completed: { color: "bg-green-500", icon: Eye },
  paused: { color: "bg-yellow-500", icon: Pause },
  dropped: { color: "bg-red-500", icon: X },
}

const typeLabels: Record<string, string> = {
  anime: "Anime",
  movie: "Película",
  series: "Serie",
  game: "Juego",
  book: "Libro",
}

const statusLabels: Record<string, string> = {
  not_started: "Planeado",
  in_progress: "En Progreso",
  completed: "Completado",
  paused: "Pausado",
  dropped: "Abandonado",
}



export default function EntertainmentDirectory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedGenre, setSelectedGenre] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [user, setUser] = useState<any>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<EntryType | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [entries, setEntries] = useState<EntryType[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/auth/login")
        return
      }
      setUser(session.user)
      await loadEntries(session.user.id)
    }
    checkAuth()
  }, [])

  //LOAD ENTRIES V1
  // const loadEntries = async (userId: string) => {
  //   try {
  //     const { data, error } = await supabase
  //       .from("entries")
  //       .select(`
  //         *,
  //         entry_genres(genre_id, genres(name)),
  //         entry_relations!entry_relations_entry_id_fkey(related_entry_title)
  //       `)
  //       .eq("user_id", userId)
  //       .order("created_at", { ascending: false })

  //     if (error) throw error

  //     const formattedEntries =
  //       data?.map((entry) => ({
  //         ...entry,
  //         genres: entry.entry_genres?.map((eg: any) => eg.genres.name) || [],
  //         related_entries: entry.entry_relations?.map((er: any) => er.related_entry_title) || [],
  //       })) || []

  //     setEntries(formattedEntries)
  //   } catch (error) {
  //     console.error("Error loading entries:", error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  //LOAD ENTRIES V2
  const loadEntries = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("entries")
        .select(`
          *,
          entry_genres(genre_id, genres(name)),
          entry_relations!entry_relations_parent_entry_id_fkey(
            related_entry_id,
            related_entry:entries!entry_relations_related_entry_id_fkey(title)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      const formattedEntries =
        data?.map((entry: any) => ({
          ...entry,
          genres: entry.entry_genres?.map((eg: any) => eg.genres.name) || [],
          related_entries: entry.entry_relations?.map((er: any) => er.related_entry.title) || [],
        })) || [];
  
      setEntries(formattedEntries);
    } catch (error) {
      console.error("Error loading entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando tu directorio...</p>
        </div>
      </div>
    )
  }

  if (showAddForm) {
    return (
      <AddEntryForm
        onSave={async (newEntry) => {
          await loadEntries(user.id)
          setShowAddForm(false)
        }}
        onCancel={() => setShowAddForm(false)}
        userId={user?.id}
      />
    )
  }

  if (selectedEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="container mx-auto max-w-4xl">
          <button
            onClick={() => setSelectedEntry(null)}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            ← Volver al directorio
          </button>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3">
                <img
                  src={selectedEntry.image_url || "/placeholder.svg"}
                  alt={selectedEntry.title}
                  className="w-full h-64 md:h-full object-cover"
                />
              </div>
              <div className="md:w-2/3 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedEntry.title}</h1>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`${typeColors[selectedEntry.type as keyof typeof typeColors]} text-white text-sm px-2 py-1 rounded-full font-medium`}
                      >
                        {typeLabels[selectedEntry.type]}
                      </span>
                      <span
                        className={`${statusConfig[selectedEntry.status as keyof typeof statusConfig].color} text-white text-sm px-2 py-1 rounded-full font-medium flex items-center gap-1`}
                      >
                        {React.createElement(statusConfig[selectedEntry.status as keyof typeof statusConfig].icon, {
                          className: "w-3 h-3",
                        })}
                        {statusLabels[selectedEntry.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < selectedEntry.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{selectedEntry.rating}/5</span>
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 mb-4">{selectedEntry.description}</p>

                {selectedEntry.genres.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Géneros</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm rounded-md"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedEntry.type === "Serie" || selectedEntry.type === "Anime") && (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Progreso</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Temporadas:</span>
                        <span className="ml-2 font-medium text-slate-900 dark:text-white">
                          {selectedEntry.current_season}/{selectedEntry.total_seasons}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Episodios:</span>
                        <span className="ml-2 font-medium text-slate-900 dark:text-white">
                          {selectedEntry.current_episode}/{selectedEntry.total_episodes}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedEntry.related_entries.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Entradas Relacionadas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.related_entries.map((entry, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-md"
                        >
                          {entry}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntry.comments && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Comentarios</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{selectedEntry.comments}</p>
                  </div>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Registrado el {new Date(selectedEntry.date_watched).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "" || entry.type === selectedType
    const matchesGenre = selectedGenre === "" || entry.genres.includes(selectedGenre)
    const matchesStatus = selectedStatus === "" || entry.status === selectedStatus
    return matchesSearch && matchesType && matchesGenre && matchesStatus
  })

  const allGenres = Array.from(new Set(entries.flatMap((entry) => entry.genres)))

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Keeping</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Registra y califica todo tu contenido favorito
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <button
                className="inline-flex items-center justify-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Entrada
              </button>
              <button
                className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                showFilters || selectedType || selectedGenre || selectedStatus
                  ? "bg-violet-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {(selectedType || selectedGenre || selectedStatus) && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                  {[selectedType, selectedGenre, selectedStatus].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFilters && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-lg">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de contenido</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        selectedType === ""
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                      onClick={() => setSelectedType("")}
                    >
                      Todos
                    </button>
                    {Object.keys(typeColors).map((type) => (
                      <button
                        key={type}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          selectedType === type
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                        onClick={() => setSelectedType(type)}
                      >
                        {typeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Géneros</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        selectedGenre === ""
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                      onClick={() => setSelectedGenre("")}
                    >
                      Todos
                    </button>
                    {allGenres.map((genre) => (
                      <button
                        key={genre}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          selectedGenre === genre
                            ? "bg-green-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                        onClick={() => setSelectedGenre(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estado</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        selectedStatus === ""
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                      onClick={() => setSelectedStatus("")}
                    >
                      Todos
                    </button>
                    {Object.keys(statusConfig).map((status) => (
                      <button
                        key={status}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                          selectedStatus === status
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                        onClick={() => setSelectedStatus(status)}
                      >
                        {React.createElement(statusConfig[status as keyof typeof statusConfig].icon, {
                          className: "w-3 h-3",
                        })}
                        {statusLabels[status as keyof typeof statusLabels]}
                      </button>
                    ))}
                  </div>
                </div>

                {(selectedType || selectedGenre || selectedStatus) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                    <button
                      onClick={() => {
                        setSelectedType("")
                        setSelectedGenre("")
                        setSelectedStatus("")
                      }}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Limpiar todos los filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden cursor-pointer relative"
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="p-0">
                <div className="relative">
                  <img
                    src={entry.image_url || "/placeholder.svg"}
                    alt={entry.title}
                    className="w-full h-48 sm:h-56 md:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {entry.status === "Completado" && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span
                      className={`${typeColors[entry.type as keyof typeof typeColors]} text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg`}
                    >
                      {typeLabels[entry.type as keyof typeof typeLabels]}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                    <h3 className="text-white font-bold text-base mb-2 line-clamp-2 leading-tight">{entry.title}</h3>

                    <div className="flex items-center gap-1 mb-2">{renderStars(entry.rating)}</div>

                    <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                      <span>{new Date(entry.date_watched).getFullYear()}</span>
                      {(entry.type === "Serie" || entry.type === "Anime") && (
                        <span>
                          T{entry.current_season}/{entry.total_seasons}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {entry.genres.slice(0, 2).map((genre, index) => (
                        <span key={index} className="text-white/70 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                          {genre}
                        </span>
                      ))}
                      {entry.genres.length > 2 && (
                        <span className="text-white/70 text-xs">+{entry.genres.length - 2}</span>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                    <div className="text-center">
                      <h4 className="text-white font-semibold mb-2">{entry.title}</h4>
                      <p className="text-white/90 text-sm line-clamp-4">{entry.description}</p>
                      {entry.status !== "Completado" && (
                        <div className="mt-2 flex items-center justify-center gap-1">
                          {React.createElement(statusConfig[entry.status as keyof typeof statusConfig].icon, {
                            className: "w-3 h-3 text-white",
                          })}
                          <span className="text-white/80 text-xs">{statusLabels[entry.status as keyof typeof statusLabels]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No se encontraron resultados</h3>
            <p className="text-slate-600 dark:text-slate-400">Intenta con otros términos de búsqueda o filtros</p>
          </div>
        )}
      </div>
    </div>
  )
}
