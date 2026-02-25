'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Plus, Volume2, VolumeX, ChevronRight, Info } from 'lucide-react';

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
  iso_639_1?: string; // Código de idioma
  iso_3166_1?: string; // Código de país
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

// Prioridad de idiomas: Español Latino > Inglés > Español España > Otros
const LANGUAGE_PRIORITY = {
  'es-MX': 1, // Español México (Latino)
  'es-419': 1, // Español Latinoamérica
  'es-AR': 1, // Español Argentina
  'es-CO': 1, // Español Colombia
  'es-CL': 1, // Español Chile
  'es-PE': 1, // Español Perú
  'es-VE': 1, // Español Venezuela
  'es-US': 1, // Español Estados Unidos (Latino)
  'en': 2,    // Inglés
  'en-US': 2,
  'en-GB': 2,
  'es': 3,    // Español genérico (probablemente España)
  'es-ES': 3, // Español España
};

export default function HeroCarousel({
  movies,
  autoPlayInterval = 8000,
  trailerDelay = 2000
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [currentAudioLang, setCurrentAudioLang] = useState<string>('');

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isMutedRef = useRef(isMuted);

  const currentMovie = movies[currentIndex];
  const isActive = isHovered;

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => { 
    setLogoLoaded(false); 
    setLogoError(false);
    setCurrentAudioLang('');
  }, [currentIndex]);

  useEffect(() => {
    if (!window.YT && !document.getElementById('youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, []);

  // Función mejorada para obtener trailer con prioridad de idioma
  const getTrailerKey = useCallback((movie: Movie): { key: string | null; lang: string } => {
    if (!movie.videos?.results?.length) return { key: null, lang: '' };

    const videos = movie.videos.results.filter(v => v.site === 'YouTube');
    
    if (videos.length === 0) return { key: null, lang: '' };

    // Primero buscar por idioma específico en name (heurística)
    const getLanguagePriority = (video: Video): number => {
      const name = video.name?.toLowerCase() || '';
      const lang = video.iso_639_1 || '';
      const country = video.iso_3166_1 || '';
      const fullLang = country ? `${lang}-${country}` : lang;

      // Prioridad 1: Latino por nombre
      if (name.includes('latino') || name.includes('latin') || name.includes('mexicano')) return 1;
      
      // Prioridad por código de idioma
      if (LANGUAGE_PRIORITY[fullLang as keyof typeof LANGUAGE_PRIORITY]) {
        return LANGUAGE_PRIORITY[fullLang as keyof typeof LANGUAGE_PRIORITY];
      }
      if (LANGUAGE_PRIORITY[lang as keyof typeof LANGUAGE_PRIORITY]) {
        return LANGUAGE_PRIORITY[lang as keyof typeof LANGUAGE_PRIORITY];
      }

      // Heurística adicional por nombre
      if (name.includes('español') || name.includes('spanish')) {
        if (name.includes('españa') || name.includes('spain') || name.includes('castellano')) return 3;
        if (name.includes('latino') || name.includes('latin')) return 1;
        return 2; // Asumir latino si no especifica
      }

      return 10; // Otros idiomas
    };

    // Ordenar videos por prioridad
    const sortedVideos = videos.sort((a, b) => {
      const priorityA = getLanguagePriority(a);
      const priorityB = getLanguagePriority(b);
      return priorityA - priorityB;
    });

    // Priorizar trailers oficiales dentro del mismo nivel de idioma
    const officialTrailers = sortedVideos.filter(v => v.type === 'Trailer' && v.official);
    const regularTrailers = sortedVideos.filter(v => v.type === 'Trailer');
    const allVideos = sortedVideos;

    const selected = officialTrailers[0] || regularTrailers[0] || allVideos[0];
    
    return { 
      key: selected?.key || null, 
      lang: selected?.iso_639_1 || 'unknown'
    };
  }, []);

  const formatRuntime = useCallback((minutes?: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const getSeriesInfo = useCallback((movie: Movie): string => {
    if (movie.media_type !== 'tv') return '';
    const seasons = movie.number_of_seasons || 0;
    const episodes = movie.number_of_episodes || 0;
    if (seasons === 1 && episodes > 0) return `${episodes} episodios`;
    if (seasons > 1) return `${seasons} temporadas`;
    return '';
  }, []);

  const getMatchPercent = useCallback((rating: number): string => {
    const match = Math.min(98, Math.round((rating / 10) * 100));
    return `${match}%`;
  }, []);

  // Trailer logic
  useEffect(() => {
    if (isActive) {
      setIsAutoPlaying(false);
      trailerTimeoutRef.current = setTimeout(() => {
        const { key, lang } = getTrailerKey(currentMovie);
        if (key) { 
          setTrailerKey(key); 
          setShowTrailer(true);
          setCurrentAudioLang(lang);
        }
      }, trailerDelay);
    } else {
      setIsAutoPlaying(true);
      setShowTrailer(false);
      setTrailerKey(null);
      setPlayerReady(false);
      setCurrentAudioLang('');
      if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);
    }
    return () => { if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current); };
  }, [isActive, currentMovie, getTrailerKey, trailerDelay]);

  // YouTube Player con configuración de idioma
  useEffect(() => {
    if (showTrailer && trailerKey && playerContainerRef.current && window.YT?.Player) {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }

      // Configurar idioma del reproductor
      const isLatino = currentAudioLang.includes('es') && !currentAudioLang.includes('ES');
      const ccLang = isLatino ? 'es-419' : 'en';

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: trailerKey,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          start: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          fs: 0,
          cc_load_policy: isLatino ? 1 : 0, // Forzar CC si es latino
          cc_lang_pref: ccLang,
          hl: isLatino ? 'es-419' : 'en', // Interfaz en español latino
          autohide: 1,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            event.target.playVideo();
            if (!isMutedRef.current) event.target.unMute();
            
            // Intentar cambiar calidad a HD
            event.target.setPlaybackQuality('hd1080');
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              setShowTrailer(false);
              setTrailerKey(null);
            }
          }
        }
      });
    }
    return () => { 
      if (!showTrailer && playerRef.current) { 
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null; 
        setPlayerReady(false); 
      } 
    };
  }, [showTrailer, trailerKey, currentAudioLang]);

  // Auto-play carousel
  useEffect(() => {
    if (isAutoPlaying && !isActive) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((p) => (p + 1) % movies.length);
        setShowTrailer(false); setTrailerKey(null); setPlayerReady(false);
      }, autoPlayInterval);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying, isActive, movies.length, autoPlayInterval]);

  const toggleMute = useCallback(() => {
    if (playerRef.current && playerReady) {
      const newState = !isMuted;
      setIsMuted(newState);
      newState ? playerRef.current.mute() : playerRef.current.unMute();
    } else {
      setIsMuted(!isMuted);
    }
  }, [playerReady, isMuted]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((p) => (p + 1) % movies.length);
    setShowTrailer(false); setTrailerKey(null); setPlayerReady(false);
  }, [movies.length]);

  // Función para mostrar etiqueta de idioma
  const getLanguageLabel = (lang: string): string => {
    if (lang.includes('es') && !lang.includes('ES')) return 'LAT';
    if (lang === 'en' || lang.includes('en')) return 'EN';
    if (lang.includes('es')) return 'ESP';
    return lang.toUpperCase();
  };

  if (!movies?.length) return null;

  const backdropUrl = `https://image.tmdb.org/t/p/original${currentMovie.backdrop_path}`;
  const logoUrl = currentMovie.logo_path ? `https://image.tmdb.org/t/p/original${currentMovie.logo_path}` : null;
  
  const year = currentMovie.media_type === 'tv' 
    ? (currentMovie.first_air_date ? new Date(currentMovie.first_air_date).getFullYear() : '')
    : (currentMovie.release_date ? new Date(currentMovie.release_date).getFullYear() : '');
  
  const durationOrSeasons = currentMovie.media_type === 'tv' 
    ? getSeriesInfo(currentMovie) 
    : formatRuntime(currentMovie.runtime);
  
  const matchPercent = getMatchPercent(currentMovie.vote_average);
  const genres = currentMovie.genres?.slice(0, 3) || [];

  return (
    <div 
      className="relative w-full h-[85vh] min-h-[600px] overflow-hidden bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={backdropUrl} 
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-700 ${showTrailer ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      {/* YouTube Trailer */}
      {showTrailer && trailerKey && (
        <div className="absolute inset-0 w-full h-full">
          <div 
            ref={playerContainerRef} 
            className="absolute inset-0 w-full h-full"
            style={{ 
              transform: 'scale(1.2)',
              pointerEvents: 'none'
            }}
          />
        </div>
      )}

      {/* Gradient Overlays */}
      <div className={`absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent transition-opacity duration-500 ${showTrailer ? 'opacity-60' : 'opacity-80'}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full pb-20 px-4 sm:px-6 lg:px-12 xl:px-16">
        <div className="max-w-2xl space-y-6">
          
          {/* Logo */}
          <div className="relative h-32 md:h-40 w-full max-w-lg">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt={currentMovie.title || currentMovie.name}
                className={`h-full w-auto object-contain object-left transition-all duration-500 ${logoLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                style={{ 
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9)) drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
                  maxWidth: '100%'
                }}
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoError(true)}
              />
            ) : (
              <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.9)' }}>
                {currentMovie.title || currentMovie.name}
              </h1>
            )}
            
            {!logoLoaded && !logoError && logoUrl && (
              <div className="absolute inset-0 bg-gray-800/50 animate-pulse rounded" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-sm md:text-base text-gray-200 flex-wrap">
            <span className="text-green-400 font-semibold">{matchPercent} de coincidencia</span>
            <span className="text-gray-400">•</span>
            <span>{year}</span>
            <span className="text-gray-400">•</span>
            <span className="border border-gray-500 px-1.5 py-0.5 text-xs rounded">{currentMovie.ageRating || '13+'}</span>
            <span className="text-gray-400">•</span>
            <span>{durationOrSeasons}</span>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500 font-bold">IMDb</span>
              <span>{currentMovie.vote_average.toFixed(1)}</span>
            </div>
            {showTrailer && (
              <>
                <span className="text-gray-400">•</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  currentAudioLang.includes('es') && !currentAudioLang.includes('ES') 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {getLanguageLabel(currentAudioLang)}
                </span>
              </>
            )}
          </div>

          {/* Overview */}
          <p className="text-gray-200 text-base md:text-lg line-clamp-3 max-w-xl leading-relaxed drop-shadow-lg">
            {currentMovie.overview}
          </p>

          {/* Genres */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {genres.map((genre, index) => (
              <React.Fragment key={genre.id}>
                <span className="hover:text-white cursor-pointer transition-colors">{genre.name}</span>
                {index < genres.length - 1 && <span>•</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <a 
              href={`https://www.themoviledb.org/${currentMovie.media_type}/${currentMovie.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-semibold hover:bg-gray-200 transition-colors"
            >
              <Play className="w-5 h-5 fill-black" />
              Reproducir
            </a>
            
            <a 
              href={`https://www.themoviedb.org/${currentMovie.media_type}/${currentMovie.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gray-600/80 text-white px-6 py-3 rounded font-semibold hover:bg-gray-500/80 transition-colors backdrop-blur-sm"
            >
              <Info className="w-5 h-5" />
              Más información
            </a>

            <button className="p-3 rounded-full border-2 border-gray-400 text-white hover:border-white hover:bg-white/10 transition-all">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="absolute right-4 sm:right-6 lg:right-12 bottom-20 flex items-center gap-3">
          {showTrailer && (
            <>
              <div className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm border border-white/20">
                {getLanguageLabel(currentAudioLang)}
              </div>
              <button 
                onClick={toggleMute}
                className="p-3 rounded-full border border-white/30 bg-black/30 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </>
          )}
          
          <button 
            onClick={nextSlide}
            className="p-3 rounded-full border border-white/30 bg-black/30 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Carousel indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              setShowTrailer(false);
              setTrailerKey(null);
            }}
            className={`h-1 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
}