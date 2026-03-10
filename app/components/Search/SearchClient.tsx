"use client";

import { useState, useCallback, FormEvent } from "react";
import { Search, Loader2, Star, Calendar, Film, X } from "lucide-react";
import Image from "next/image";

interface Movie {
  id: number;
  title: string;
  name?: string;
  original_title: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  media_type: string;
}

interface SearchResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMovies = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error("Error al buscar películas");
      }

      const data: SearchResponse = await response.json();
      setMovies(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchMovies(query);
  };

  const clearSearch = () => {
    setQuery("");
    setMovies([]);
    setHasSearched(false);
    setError(null);
  };

  const getTitle = (movie: Movie) => movie.title || movie.name || "Sin título";
  
  const getDate = (movie: Movie) => movie.release_date || movie.first_air_date;

  const getImageUrl = (path: string | null, size: string = "w500") => {
    if (!path) return "/placeholder-movie.png";
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center bg-linear-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
        Buscar Películas y Series
      </h1>
      
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-12">
        <div className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe para buscar..."
            className="w-full px-6 py-4 bg-gray-800 border-2 border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-300 pr-24 text-lg"
          />
          
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors duration-200"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-500" />
          <p className="text-gray-400">Buscando...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-center text-red-400 max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {!loading && hasSearched && movies.length === 0 && !error && (
        <div className="text-center py-20 text-gray-400">
          <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">No se encontraron resultados</p>
          <p className="text-sm mt-2">Intenta con otros términos</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {movies.map((movie) => (
          <div
            key={`${movie.media_type}-${movie.id}`}
            className="group bg-gray-800 rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20"
          >
            <div className="relative aspect-2/3 overflow-hidden bg-gray-700">
              <Image
                src={getImageUrl(movie.poster_path)}
                alt={getTitle(movie)}
                fill
                className="object-cover group-hover:opacity-75 transition-opacity"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold">
                  {movie.vote_average.toFixed(1)}
                </span>
              </div>

              <div className="absolute top-2 left-2 bg-red-600/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase">
                {movie.media_type === 'movie' ? 'Película' : 'Serie'}
              </div>
            </div>

            <div className="p-4 space-y-2">
              <h3 className="font-bold text-lg line-clamp-1 group-hover:text-red-400 transition-colors">
                {getTitle(movie)}
              </h3>
              
              <p className="text-sm text-gray-300 line-clamp-2 h-10">
                {movie.overview || "Sin descripción"}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-400 pt-2">
                {getDate(movie) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(getDate(movie)!).getFullYear()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  <span>{movie.vote_count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}