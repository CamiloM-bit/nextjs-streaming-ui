'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';

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
  videos?: {
    results: Video[];
  };
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  runtime?: number;
  ageRating?: string;
  logo_path?: string;
}

interface HeroCarouselProps {
  movies: Movie[];
  autoPlayInterval?: number;
  trailerDelay?: number;
}

export default function HeroCarousel({
  movies,
  autoPlayInterval = 8000,
  trailerDelay = 5000,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isMutedRef = useRef(isMuted);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMovie = movies[currentIndex];
  const isActive = isHovered || isFocused; // Activo si hay hover O focus

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setLogoLoaded(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!window.YT && !document.getElementById('youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const getTrailerKey = useCallback((movie: Movie): string | null => {
    if (!movie.videos?.results || movie.videos.results.length === 0) return null;
    
    const trailer = movie.videos.results.find(
      (video) => video.type === 'Trailer' && video.official && video.site === 'YouTube'
    ) || movie.videos.results.find(
      (video) => video.type === 'Trailer' && video.site === 'YouTube'
    ) || movie.videos.results.find(
      (video) => video.site === 'YouTube'
    );
    
    return trailer?.key || null;
  }, []);

  const formatRuntime = (minutes: number | undefined): string => {
    if (!minutes || minutes <= 0) return '';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  const getSeriesInfo = (movie: Movie): string => {
    if (movie.media_type !== 'tv') return '';
    
    const seasons = movie.number_of_seasons || 0;
    const episodes = movie.number_of_episodes || 0;
    
    if (seasons === 1 && episodes > 0) {
      return `${episodes} ${episodes === 1 ? 'episodio' : 'episodios'}`;
    } else if (seasons > 1) {
      return `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}`;
    }
    
    return '';
  };

  const getExtraInfo = (movie: Movie): string => {
    if (movie.media_type === 'tv') {
      return getSeriesInfo(movie);
    } else {
      return formatRuntime(movie.runtime);
    }
  };

  // Efecto para manejar trailer cuando está activo (hover o focus)
  useEffect(() => {
    if (isActive) {
      setIsAutoPlaying(false);
      
      trailerTimeoutRef.current = setTimeout(() => {
        const key = getTrailerKey(currentMovie);
        if (key) {
          setTrailerKey(key);
          setShowTrailer(true);
        }
      }, trailerDelay);
    } else {
      setIsAutoPlaying(true);
      setShowTrailer(false);
      setTrailerKey(null);
      setPlayerReady(false);
      
      if (trailerTimeoutRef.current) {
        clearTimeout(trailerTimeoutRef.current);
      }
    }

    return () => {
      if (trailerTimeoutRef.current) {
        clearTimeout(trailerTimeoutRef.current);
      }
    };
  }, [isActive, currentMovie, getTrailerKey, trailerDelay]);

  useEffect(() => {
    if (showTrailer && trailerKey && playerContainerRef.current) {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

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
              if (isMutedRef.current) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                event.target.playVideo();
              }
            }
          }
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        window.onYouTubeIframeAPIReady = createPlayer;
      }
    }

    return () => {
      if (!showTrailer && playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setPlayerReady(false);
      }
    };
  }, [showTrailer, trailerKey]);

  const toggleMute = useCallback(() => {
    if (playerRef.current && playerReady) {
      const newMutedState = !isMutedRef.current;
      setIsMuted(newMutedState);
      
      if (newMutedState) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
  }, [playerReady]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
    setShowTrailer(false);
    setTrailerKey(null);
    setPlayerReady(false);
    setLogoLoaded(false);
  }, [movies.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
    setShowTrailer(false);
    setTrailerKey(null);
    setPlayerReady(false);
    setLogoLoaded(false);
  }, [movies.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setShowTrailer(false);
    setTrailerKey(null);
    setPlayerReady(false);
    setLogoLoaded(false);
  };

  // Auto-play del carrusel
  useEffect(() => {
    if (isAutoPlaying && !isActive) {
      autoPlayRef.current = setInterval(nextSlide, autoPlayInterval);
    }
    
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, isActive, nextSlide, autoPlayInterval]);

  // Handlers para focus/blur en elementos del carrusel
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Solo quitar el focus si el nuevo elemento enfocado NO está dentro del carrusel
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
    }
  };

  if (!movies || movies.length === 0) return null;

  const extraInfo = getExtraInfo(currentMovie);
  const hasLogo = currentMovie.logo_path && currentMovie.logo_path.length > 0;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagen de fondo */}
      <div 
        className={`absolute inset-0 z-0 transition-opacity duration-700 ${
          showTrailer ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <img
          src={`https://image.tmdb.org/t/p/original${currentMovie.backdrop_path}`}
          alt={currentMovie.title || currentMovie.name || 'Movie'}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      </div>

      {/* Trailer de YouTube */}
      {showTrailer && trailerKey && (
        <div className="absolute inset-0 z-10 w-full h-full overflow-hidden">
          <div 
            ref={playerContainerRef}
            className="w-full h-full"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      )}

      {/* Gradientes */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/50 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/70 via-black/30 to-transparent z-20 pointer-events-none" />

      {/* Contenido */}
      <div className="relative z-30 flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 max-w-4xl">
        <div className="transition-all duration-500">
          {/* Badge y metadata */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="px-3 py-1 text-xs font-bold text-black bg-white rounded">
              {currentMovie.media_type === 'tv' ? 'SERIE' : 'PELÍCULA'}
            </span>
            
            {currentMovie.ageRating && (
              <span className="px-2 py-1 text-xs font-bold text-white bg-gray-600 rounded border border-gray-400">
                {currentMovie.ageRating}
              </span>
            )}
            
            {extraInfo && (
              <span className="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded">
                {extraInfo}
              </span>
            )}
            
            {currentMovie.vote_average > 0 && (
              <span className="flex items-center gap-1 text-green-400 font-semibold">
                {currentMovie.vote_average.toFixed(1)} Rating
              </span>
            )}
            
            {currentMovie.release_date && currentMovie.media_type === 'movie' && (
              <span className="text-gray-300">
                {new Date(currentMovie.release_date).getFullYear()}
              </span>
            )}
            
            {currentMovie.first_air_date && currentMovie.media_type === 'tv' && (
              <span className="text-gray-300">
                {new Date(currentMovie.first_air_date).getFullYear()}
              </span>
            )}
          </div>

          {/* Logo del título o texto fallback */}
          <div className="mb-6 relative">
            {hasLogo ? (
              <div className="relative w-full max-w-lg">
                <img
                  src={`https://image.tmdb.org/t/p/w500${currentMovie.logo_path}`}
                  alt={currentMovie.title || currentMovie.name || 'Title'}
                  className={`w-full h-auto max-h-32 object-contain object-left transition-opacity duration-500 drop-shadow-lg ${
                    logoLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoLoaded(false)}
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))' }}
                />
                {!logoLoaded && (
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-lg">
                    {currentMovie.title || currentMovie.name}
                  </h1>
                )}
              </div>
            ) : (
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-lg">
                {currentMovie.title || currentMovie.name}
              </h1>
            )}
          </div>

          {/* Overview */}
          <p className={`text-lg md:text-xl text-gray-200 mb-8 line-clamp-3 max-w-2xl drop-shadow-md transition-opacity duration-300 ${showTrailer ? 'opacity-0' : 'opacity-100'}`}>
            {currentMovie.overview}
          </p>

          {/* Botones con handlers de focus/blur */}
          <div className="flex flex-wrap items-center gap-4">
            <button 
              tabIndex={0}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            >
              <Play className="w-5 h-5 fill-black" />
              Reproducir
            </button>
            
            <button 
              tabIndex={0}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="flex items-center gap-2 px-8 py-3 bg-gray-500/70 text-white font-bold rounded hover:bg-gray-500/50 transition-colors backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            >
              <Info className="w-5 h-5" />
              Más información
            </button>

            {showTrailer && trailerKey && (
              <button
                tabIndex={0}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-black/50 text-white font-semibold rounded-full hover:bg-black/70 transition-all backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                {isMuted ? 'Activar sonido' : 'Silenciar'}
              </button>
            )}
          </div>

          {isActive && !showTrailer && getTrailerKey(currentMovie) && (
            <div className="mt-6 flex items-center gap-2 text-white/70 text-sm">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              {isFocused ? 'Focus activo - trailer en ' : 'Mantén el cursor para ver el trailer en '}
              {trailerDelay / 1000}s...
            </div>
          )}
        </div>
      </div>

      {/* Controles de navegación con handlers de focus/blur */}
      <button
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots indicadores con handlers de focus/blur */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex gap-2">
        {movies.map((_, index) => (
          <button
            key={index}
            tabIndex={0}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black ${
              index === currentIndex 
                ? 'w-8 h-2 bg-white' 
                : 'w-2 h-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Barra de progreso */}
      {isAutoPlaying && !isActive && (
        <div className="absolute bottom-0 left-0 h-1 bg-red-600 z-50 transition-all ease-linear"
          style={{
            width: '100%',
            animation: `progress ${autoPlayInterval}ms linear infinite`,
          }}
        />
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}