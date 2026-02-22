"use client"

import { useEffect, useState, useRef } from "react"

export default function HeroCarousel() {
  const [movies, setMovies] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [showTrailer, setShowTrailer] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1️⃣ Traer películas
  useEffect(() => {
    async function fetchMovies() {
      const res = await fetch("/api/tmdb/trending")
      const data = await res.json()
      setMovies(data.results.slice(0, 5))
    }

    fetchMovies()
  }, [])

  // 2️⃣ Cambio automático cada 8s
  useEffect(() => {
    if (!movies.length) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length)
      setShowTrailer(false)
    }, 8000)

    return () => clearInterval(interval)
  }, [movies])

  // 3️⃣ Traer trailer cuando cambie película
  useEffect(() => {
    async function fetchTrailer() {
      if (!movies[currentIndex]) return

      const res = await fetch(
        `/api/tmdb/videos/${movies[currentIndex].id}`
      )
      const data = await res.json()

      const trailer = data.results.find(
        (vid: any) =>
          vid.type === "Trailer" && vid.site === "YouTube"
      )

      setTrailerKey(trailer ? trailer.key : null)
    }

    fetchTrailer()
  }, [currentIndex, movies])

  // 4️⃣ Hover 5 segundos
  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTrailer(true)
    }, 5000)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowTrailer(false)
  }

  if (!movies.length) return null

  const movie = movies[currentIndex]

  return (
    <div
      className="relative h-[80vh] w-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showTrailer && trailerKey ? (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0`}
          allow="autoplay"
        />
      ) : (
        <img
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
          className="w-full h-full object-cover transition-opacity duration-700"
        />
      )}

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />

      {/* Información */}
      <div className="absolute bottom-20 left-10 text-white z-10">
        <h1 className="text-5xl font-bold">{movie.title}</h1>
        <p className="max-w-xl mt-4 line-clamp-3">
          {movie.overview}
        </p>
      </div>
    </div>
  )
}