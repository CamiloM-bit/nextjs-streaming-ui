'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Plus, Volume2, VolumeX, ChevronRight, Download } from 'lucide-react';

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
  const [showDownloadMsg, setShowDownloadMsg] = useState(false);

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

  const handleDownload = () => {
    setShowDownloadMsg(true);
    setTimeout(() => setShowDownloadMsg(false), 8000);
  };

  // Focus handlers
  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) setIsFocused(false);
  };

  if (!movies?.length) return null;

  // URL del backdrop
  const backdropUrl = `https://image.tmdb.org/t/p/original${currentMovie.backdrop_path}`;
  
  // URL del logo
  const logoUrl = currentMovie.logo_path ? `https://image.tmdb.org/t/p/w500${currentMovie.logo_path}` : null;
  
  // Año
  const year = currentMovie.media_type === 'tv' 
    ? (currentMovie.first_air_date ? new Date(currentMovie.first_air_date).getFullYear() : '')
    : (currentMovie.release_date ? new Date(currentMovie.release_date).getFullYear() : '');
  
  // Info de duración o temporadas
  const durationOrSeasons = currentMovie.media_type === 'tv' 
    ? getSeriesInfo(currentMovie) 
    : formatRuntime(currentMovie.runtime);
  
  // Match %
  const matchPercent = getMatchPercent(currentMovie.vote_average);

  // Géneros
  const genres = currentMovie.genres || [];

  return (
    <>
      {/* Mensaje de descarga */}
      {showDownloadMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>Descargando...</span>
          <button onClick={() => setShowDownloadMsg(false)} className="text-white hover:text-gray-200">×</button>
        </div>
      )}

      {/* contenedor principal */}
      <div 
        ref={containerRef}
        className='relative h-152 w-full border-yellow-500'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        {/* Contenedor banner de la pelicula e serie */}
        <div className='z-5 border-blue-500 absolute w-full h-full'>
          {/* Imagen de fondo de la API */}
          <img 
            src={backdropUrl} 
            alt=""
            className="border-red-500 object-cover h-full w-full"
          />
        </div>

        {/* Trailer de YouTube (encima de la imagen, debajo del gradiente) */}
        {showTrailer && trailerKey && (
          <div className='z-6 absolute w-full h-full'>
            <div ref={playerContainerRef} className="w-full h-full" />
          </div>
        )}

        {/* Overline fondo gradiente - opacidad cambia cuando hay trailer */}
        <div className={`z-7 absolute w-full h-full inset-0 bg-linear-to-r from-black via-[#000000e7] to-transparent transition-opacity duration-500 ${showTrailer ? 'opacity-70' : 'opacity-100'}`} />

        <div className='absolute left-[3%] flex flex-col bottom-0 gap-5 z-8 border-red-500 w-[97%] h-[75%] '>

          {/* Logo container - Logo del título de la API */}
          <div className='border-blue-500 h-40 w-116'>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="" 
                className='h-full object-contain'
                onLoad={() => setLogoLoaded(true)}
                style={{ opacity: logoLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
              />
            ) : (
              <h1 className='text-white text-4xl font-bold'>{currentMovie.title || currentMovie.name}</h1>
            )}
          </div>

          {/* Datos: IMDb, año, duración/temporadas, match */}
          <div className='border-red-500 flex gap-1.5 items-center w-120 text-white'>
            <div className='flex items-center gap-1'>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/960px-IMDB_Logo_2016.svg.png" alt="" className='w-10' />
              <p>{currentMovie.vote_average.toFixed(1)}</p>
            </div>
            <p>·</p>
            <p>{year}</p>
            <p>·</p>
            <p>{durationOrSeasons}</p>
            <p>·</p>
            <p className='text-green-500 font-semibold'>{matchPercent} match</p>
          </div>

          {/* Sinopsis - truncada a 3 líneas */}
          <div className='border-blue-500 w-132'>
            <p className='text-white line-clamp-3'>
              {currentMovie.overview}
              {currentMovie.overview && currentMovie.overview.length > 150 && (
                <a 
                  href={`https://www.themoviedb.org/${currentMovie.media_type}/${currentMovie.id}`} 
                  target='_blank' 
                  rel="noopener noreferrer"
                  className='text-blue-400 hover:text-blue-300 ml-1'
                >
                  ...
                </a>
              )}
            </p>
          </div>

          {/* Botones */}
          <div className='flex flex-1 items-center gap-2.5 w-full border-red-400 relative top-3.5 mb-0'>

            {/* Botón descargar - abre mensaje */}
            <button 
              onClick={handleDownload}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className='bg-[#3b3a3a80] cursor-pointer focus:border border-yellow-500 p-3 w-13.5 h-13.5 rounded-full focus:border-red-500 flex items-center justify-center'
            >
              <Download className="w-6 h-6 text-white" />
            </button>

            {/* Watch now - link a TMDB */}
            <a 
              href={`https://www.themoviedb.org/${currentMovie.media_type}/${currentMovie.id}`}
              target='_blank'
              rel="noopener noreferrer"
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <button className='bg-[#ffffff] w-40 flex items-center gap-1.5 pl-6 pr-7 cursor-pointer focus:border text-black border-yellow-500 p-3 h-13.5 rounded-full focus:border-red-500'>
                <span className='border-red-500 w-2.5'>
                  <Play className="w-5 h-5 fill-black" />
                </span>
                Watch now
              </button>
            </a>

            {/* Agregar a lista */}
            <button 
              onFocus={handleFocus}
              onBlur={handleBlur}
              className='bg-[#3b3a3a80] cursor-pointer focus:border border-yellow-500 p-3 w-13.5 h-13.5 rounded-full focus:border-red-500 flex items-center justify-center text-white text-2xl'
            >
              <Plus className="w-6 h-6" />
            </button>

            {/* Siguiente slide */}
            <button 
              onClick={nextSlide}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className='bg-[#3b3a3a80] cursor-pointer focus:border border-yellow-500 p-3 w-13.5 h-13.5 rounded-full focus:border-red-500 flex items-center justify-center'
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            {/* Clasificación de edad y mute - derecha */}
            <div className='gap-2 h-full font-semibold flex items-center absolute border-red-500 w-40 z-9 bg-red bottom-0 right-0'>

              {/* Botón mute */}
              <button 
                onClick={toggleMute}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className='bg-[#3b3a3aab] cursor-pointer focus:border border-yellow-500 p-3 w-13.5 h-13.5 rounded-full focus:border-red-500 flex items-center justify-center'
              >
                {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>

              {/* Clasificación de edad */}
              <div className='bg-[#3b3a3aab] border-red-500 flex-1 h-full relative flex items-center pl-2'>
                <p className='text-white'>{currentMovie.ageRating || '13+'}</p>
              </div>

            </div>
          </div>

          {/* Categorías/Géneros */}
          <div className='flex gap-2.5 text-gray-400 relative items-center h-16 bottom-0'>
            {genres.map((genre, index) => (
              <React.Fragment key={genre.id}>
                <a 
                  href={`https://www.themoviedb.org/genre/${genre.id}`}
                  target='_blank'
                  rel="noopener noreferrer"
                  className='hover:text-white transition-colors'
                >
                  {genre.name}
                </a>
                {index < genres.length - 1 && <span>·</span>}
              </React.Fragment>
            ))}
          </div>

        </div>

      </div>
    </>
  );
}