'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
}

interface Genre {
  id: number;
  name: string;
}

interface Movie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  videos?: { results: Video[] };
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  runtime?: number;
  ageRating?: string;
  logo_path?: string;
  genres?: Genre[];
}

interface HeroCarouselProps {
  movies: Movie[];
  autoPlayInterval?: number;
  trailerDelay?: number;
}

export default function HeroCarousel({ 
  movies, 
  autoPlayInterval = 8000, 
  trailerDelay = 5000 
}: HeroCarouselProps) {
  
  // Estados
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Refs
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isMutedRef = useRef(isMuted);
  const containerRef = useRef<HTMLDivElement>(null);

  // Datos de la película actual
  const currentMovie = movies[currentIndex];
  const isActive = isHovered || isFocused;

  // Efectos de sincronización
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { setLogoLoaded(false); }, [currentIndex]);

  // Cargar API de YouTube
  useEffect(() => {
    if (!window.YT && !document.getElementById('youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Obtener trailer de YouTube
  const getTrailerKey = useCallback((movie: Movie): string | null => {
    if (!movie.videos?.results?.length) return null;
    return movie.videos.results.find((v) => v.type === 'Trailer' && v.official && v.site === 'YouTube')?.key ||
           movie.videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key ||
           movie.videos.results.find((v) => v.site === 'YouTube')?.key || null;
  }, []);

  // Formatear duración
  const formatRuntime = useCallback((minutes?: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  // Info de series (temporadas/episodios)
  const getSeriesInfo = useCallback((movie: Movie): string => {
    if (movie.media_type !== 'tv') return '';
    const seasons = movie.number_of_seasons || 0;
    const episodes = movie.number_of_episodes || 0;
    if (seasons === 1 && episodes > 0) return `${episodes} episodios`;
    if (seasons > 1) return `${seasons} temporadas`;
    return '';
  }, []);

  // Porcentaje de match (basado en rating)
  const getMatchPercent = useCallback((rating: number): string => {
    const match = Math.min(98, Math.round((rating / 10) * 100));
    return `${match}%`;
  }, []);

  // Efecto: reproducir trailer después de delay cuando está activo
  useEffect(() => {
    if (isActive) {
      setIsAutoPlaying(false);
      trailerTimeoutRef.current = setTimeout(() => {
        const key = getTrailerKey(currentMovie);
        if (key) { setTrailerKey(key); setShowTrailer(true); }
      }, trailerDelay);
    } else {
      setIsAutoPlaying(true);
      setShowTrailer(false);
      setTrailerKey(null);
      setPlayerReady(false);
      if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);
    }
    return () => { if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current); };
  }, [isActive, currentMovie, getTrailerKey, trailerDelay]);

  // Efecto: crear player de YouTube
  useEffect(() => {
    if (showTrailer && trailerKey && playerContainerRef.current) {
      if (playerRef.current) playerRef.current.destroy();

      const createPlayer = () => {
        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          videoId: trailerKey,
          playerVars: {
            autoplay: 1,
            mute: isMutedRef.current ? 1 : 0,
            controls: 0,
            loop: 1,
            playlist: trailerKey,
            start: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              setPlayerReady(true);
              event.target.playVideo();
              isMutedRef.current ? event.target.mute() : event.target.unMute();
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) event.target.playVideo();
            }
          }
        });
      };

      window.YT?.Player ? createPlayer() : (window.onYouTubeIframeAPIReady = createPlayer);
    }
    return () => { if (!showTrailer && playerRef.current) { playerRef.current.destroy(); playerRef.current = null; setPlayerReady(false); } };
  }, [showTrailer, trailerKey]);

  // Auto-play del carrusel
  useEffect(() => {
    if (isAutoPlaying && !isActive) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((p) => (p + 1) % movies.length);
        setShowTrailer(false); setTrailerKey(null); setPlayerReady(false); setLogoLoaded(false);
      }, autoPlayInterval);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying, isActive, movies.length, autoPlayInterval]);

  // Handlers
  const toggleMute = useCallback(() => {
    if (playerRef.current && playerReady) {
      const newState = !isMutedRef.current;
      setIsMuted(newState);
      newState ? playerRef.current.mute() : playerRef.current.unMute();
    }
  }, [playerReady]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowTrailer(false); setTrailerKey(null); setPlayerReady(false); setLogoLoaded(false);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((p) => (p + 1) % movies.length);
    setShowTrailer(false); setTrailerKey(null); setPlayerReady(false); setLogoLoaded(false);
  }, [movies.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((p) => (p - 1 + movies.length) % movies.length);
    setShowTrailer(false); setTrailerKey(null); setPlayerReady(false); setLogoLoaded(false);
  }, [movies.length]);

  // Focus handlers
  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) setIsFocused(false);
  };

  if (!movies?.length) return null;

  // ============================================================
  // NOTAS PARA IMPLEMENTACIÓN:
  // 
  // VARIABLES DISPONIBLES:
  // 
  // currentMovie -> Objeto completo de la película/serie actual
  // currentMovie.title / currentMovie.name -> Título
  // currentMovie.overview -> Descripción
  // currentMovie.backdrop_path -> Ruta imagen fondo (usar con https://image.tmdb.org/t/p/original)
  // currentMovie.poster_path -> Ruta poster
  // currentMovie.vote_average -> Rating (0-10)
  // currentMovie.media_type -> 'movie' o 'tv'
  // currentMovie.runtime -> Duración en minutos (películas)
  // currentMovie.number_of_seasons -> Número temporadas (series)
  // currentMovie.number_of_episodes -> Número episodios (series)
  // currentMovie.ageRating -> Clasificación edad formato "+16"
  // currentMovie.logo_path -> Ruta logo título (usar con https://image.tmdb.org/t/p/w500)
  // currentMovie.genres -> Array de géneros [{id, name}]
  // currentMovie.videos -> Objecto con trailers
  // 
  // ESTADOS:
  // showTrailer -> boolean (true cuando el trailer está reproduciéndose)
  // isMuted -> boolean (estado del audio)
  // currentIndex -> número (slide actual)
  // movies.length -> total de slides
  // logoLoaded -> boolean (si el logo ya cargó)
  // 
  // REFS (NO ELIMINAR):
  // containerRef -> ref del contenedor principal
  // playerContainerRef -> ref donde se inyecta el iframe de YouTube
  // 
  // HANDLERS (usar en eventos onClick/onFocus/onBlur):
  // goToSlide(index) -> cambiar a slide específico
  // nextSlide() -> siguiente slide
  // prevSlide() -> anterior slide
  // toggleMute() -> silenciar/activar audio
  // handleFocus() -> cuando un elemento recibe foco
  // handleBlur(e) -> cuando un elemento pierde foco
  // 
  // EVENTOS DEL CONTENEDOR PRINCIPAL:
  // onMouseEnter={() => setIsHovered(true)}
  // onMouseLeave={() => setIsHovered(false)}
  // ============================================================

  return (
    <>
    <div className='bg-blue-600'>
      
    </div>
    </>
  );
}