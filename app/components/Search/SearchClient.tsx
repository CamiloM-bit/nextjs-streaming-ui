"use client";

import { useState, useCallback, FormEvent, useEffect } from "react";
import { Search, X } from "lucide-react";
import Image from "next/image";

interface Movie {
  id: number;
  title: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: string;
  genre_ids: number[];
}

interface SearchResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

const GENRES = [
  { id: 28, name: "Acción" },
  { id: 35, name: "Comedia" },
  { id: 18, name: "Drama" },
  { id: 878, name: "Ciencia Ficción" },
  { id: 27, name: "Terror" },
  { id: 99, name: "Documentales" },
  { id: 16, name: "Anime" },
  { id: 14, name: "Fantasía" },
  { id: 10749, name: "Romance" },
  { id: 53, name: "Thrillers" },
];

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(28);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadPopularByGenre(selectedGenre);
  }, [selectedGenre]);

  const loadPopularByGenre = async (genreId: number | null) => {
    setLoading(true);
    try {
      const genreParam = genreId ? `&with_genres=${genreId}` : "";
      const response = await fetch(
        `/api/tmdb/discover?sort_by=popularity.desc${genreParam}`
      );
      
      if (!response.ok) throw new Error("Error");
      
      const data = await response.json();
      setMovies(data.results);
      setHasSearched(false);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const searchMovies = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      loadPopularByGenre(selectedGenre);
      return;
    }
    
    setLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) throw new Error("Error");

      const data: SearchResponse = await response.json();
      setMovies(data.results);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchMovies(query);
  };

  const handleGenreClick = (genreId: number) => {
    setSelectedGenre(genreId);
    setQuery("");
    setHasSearched(false);
    loadPopularByGenre(genreId);
  };

  const clearSearch = () => {
    setQuery("");
    setHasSearched(false);
    loadPopularByGenre(selectedGenre);
  };

  const getTitle = (movie: Movie) => movie.title || movie.name || "";

  const getImageUrl = (path: string | null) => {
    if (!path) return "/placeholder-movie.png";
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const getGenreName = (id: number | null) => {
    if (!id) return "";
    return GENRES.find(g => g.id === id)?.name || "";
  };

  return (
    <>
      {/* Barra de búsqueda */}
      <div className="sticky top-0 mb-20 z-50  bg-black/95 backdrop-blur-sm px-4 py-4 pt-20">
        <form onSubmit={handleSubmit} className="max-w-2xl ml-8  border border-blue-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Títulos, personas, géneros"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-12 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filtros de género */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2 max-w-7xl mx-auto">
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              onClick={() => handleGenreClick(genre.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === genre.id && !hasSearched
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {/* Título de sección */}
      <div className="px-4 mb-4 max-w-7xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-200">
          {hasSearched 
            ? `Resultados de "${query}"`
            : `Búsquedas populares en ${getGenreName(selectedGenre)}`
          }
        </h2>
      </div>

      {/* Grid de resultados */}
      <div className="px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <div
              key={`${movie.media_type}-${movie.id}`}
              className="group relative aspect-video rounded-lg overflow-hidden bg-gray-800 cursor-pointer"
            >
              <Image
                src={getImageUrl(movie.backdrop_path || movie.poster_path)}
                alt={getTitle(movie)}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-sm font-medium line-clamp-2 group-hover:text-red-400 transition-colors">
                  {getTitle(movie)}
                </h3>
              </div>

              <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/20 rounded-lg transition-colors" />
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        )}

        {!loading && movies.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>No se encontraron resultados</p>
          </div>
        )}
      </div>
    </>
  );
}