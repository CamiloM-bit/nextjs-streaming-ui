'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Plus, Volume2, VolumeX, ChevronRight, Info, Globe, ChevronDown, Clock } from 'lucide-react';

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
  iso_639_1?: string;
  iso_3166_1?: string;
}

interface Genre {
  id: number;
  name: string;
}

export interface CarouselItem {
  id: number;
  displayTitle: string;
  displayYear: string;
  displayRuntime: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  ageRating?: string;
  logo_path?: string;
  genres?: Genre[];
  videos?: { results: Video[] };
  mediaType: 'movie' | 'tv';
  tmdbUrl: string;
}

interface HeroCarouselProps {
  items: CarouselItem[];
  mediaType?: 'movie' | 'tv';
  autoPlayInterval?: number;
  trailerDelay?: number;
}

type AudioOption = {
  key: string;
  name: string;
  lang: string;
  label: string;
};

type QualityLevel = 'highres' | 'hd1080' | 'hd720' | 'large' | 'medium' | 'small' | 'tiny' | 'auto';

const logoCache = new Map<string, HTMLImageElement>();
let youtubeApiLoaded = false;

export default function HeroCarousel({
  items,
  mediaType: defaultMediaType = 'movie',
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
  const [availableAudios, setAvailableAudios] = useState<AudioOption[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<number>(0);
  const [showAudioSelector, setShowAudioSelector] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>('highres');
  const [performanceIssues, setPerformanceIssues] = useState(0);
  const [playerInstance, setPlayerInstance] = useState(0);

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isMutedRef = useRef(isMuted);
  const lastPlaybackTime = useRef<number>(0);
  const stallCount = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActiveRef = useRef(false);

  const currentItem = items[currentIndex];
  const isActive = isHovered;

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // NAVEGACIÓN CON TECLADO - Solo cuando está enfocado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const isInViewport = rect.top >= -100 && rect.bottom <= window.innerHeight + 100;
      
      if (!isInViewport) return;

      switch(e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentIndex((p) => (p - 1 + items.length) % items.length);
          cleanupTrailer();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (showTrailer) {
            toggleMute();
          } else {
            setIsHovered(true);
          }
          break;
        case 'Escape':
          if (showTrailer) {
            cleanupTrailer();
            setIsHovered(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, showTrailer]);

  const cleanupTrailer = useCallback(() => {
    setShowTrailer(false);
    setTrailerKey(null);
    setPlayerReady(false);
    setAvailableAudios([]);
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch(e) {}
      playerRef.current = null;
    }
  }, []);

  const getMatchPercent = useCallback((rating: number): string => {
    const match = Math.min(98, Math.round((rating / 10) * 100));
    return `${match}%`;
  }, []);

  // EFECTOS - LOGOS
  useEffect(() => {
    const preloadLogo = (item: CarouselItem) => {
      if (!item.logo_path || logoCache.has(item.logo_path)) return;
      
      const img = new Image();
      const logoUrl = `https://image.tmdb.org/t/p/original${item.logo_path}`;
      
      img.onload = () => {
        logoCache.set(item.logo_path!, img);
      };
      
      img.src = logoUrl;
    };

    items.forEach(preloadLogo);
  }, [items]);

  useEffect(() => {
    setLogoLoaded(false);
    setLogoError(false);
    
    const nextIndex = (currentIndex + 1) % items.length;
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    
    if (items[nextIndex]?.logo_path) {
      const img = new Image();
      img.src = `https://image.tmdb.org/t/p/original${items[nextIndex].logo_path}`;
    }
    if (items[prevIndex]?.logo_path) {
      const img = new Image();
      img.src = `https://image.tmdb.org/t/p/original${items[prevIndex].logo_path}`;
    }
    
    if (currentItem?.logo_path && logoCache.has(currentItem.logo_path)) {
      setLogoLoaded(true);
    }
    
    cleanupTrailer();
    setCurrentQuality('highres');
    setPerformanceIssues(0);
    stallCount.current = 0;
  }, [currentIndex, items, currentItem, cleanupTrailer]);

  // CARGAR YOUTUBE API SOLO UNA VEZ
  useEffect(() => {
    if (!youtubeApiLoaded && !window.YT && !document.getElementById('youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.body.appendChild(tag);
      youtubeApiLoaded = true;
    }
  }, []);

  const checkPerformance = useCallback(() => {
    if (!playerRef.current || !playerReady) return;

    try {
      const currentTime = playerRef.current.getCurrentTime?.() || 0;
      const playerState = playerRef.current.getPlayerState?.();
      
      if (playerState === window.YT?.PlayerState?.PLAYING) {
        if (Math.abs(currentTime - lastPlaybackTime.current) < 0.1) {
          stallCount.current++;
          
          if (stallCount.current > 3) {
            setPerformanceIssues(prev => {
              const newIssues = prev + 1;
              
              if (newIssues > 2 && currentQuality === 'highres') {
                setCurrentQuality('hd1080');
                playerRef.current?.setPlaybackQuality?.('hd1080');
              } else if (newIssues > 4 && currentQuality === 'hd1080') {
                setCurrentQuality('hd720');
                playerRef.current?.setPlaybackQuality?.('hd720');
              }
              
              return newIssues;
            });
            stallCount.current = 0;
          }
        } else {
          stallCount.current = Math.max(0, stallCount.current - 1);
        }
        
        lastPlaybackTime.current = currentTime;
      }
    } catch (e) {}
  }, [playerReady, currentQuality]);

  useEffect(() => {
    if (!showTrailer || !playerReady) return;
    
    const interval = setInterval(checkPerformance, 2000);
    return () => clearInterval(interval);
  }, [showTrailer, playerReady, checkPerformance]);

  const organizeVideosByLanguage = useCallback((item: CarouselItem): AudioOption[] => {
    if (!item.videos?.results?.length) return [];

    const videos = item.videos.results.filter(v => v.site === 'YouTube');
    const options: AudioOption[] = [];
    const usedKeys = new Set();

    videos.forEach(v => {
      const name = v.name?.toLowerCase() || '';
      const isLatino = name.includes('latino') || name.includes('latin') || name.includes('mexicano');
      const isES = v.iso_639_1 === 'es' && (v.iso_3166_1 === 'MX' || v.iso_3166_1 === 'AR' || !v.iso_3166_1);
      
      if ((isLatino || isES) && !usedKeys.has(v.key)) {
        options.push({
          key: v.key,
          name: v.name,
          lang: v.iso_639_1 || 'es',
          label: 'Español Latino'
        });
        usedKeys.add(v.key);
      }
    });

    videos.forEach(v => {
      if (v.iso_639_1 === 'en' && !usedKeys.has(v.key)) {
        options.push({
          key: v.key,
          name: v.name,
          lang: 'en',
          label: 'English'
        });
        usedKeys.add(v.key);
      }
    });

    videos.forEach(v => {
      if (v.iso_639_1 === 'es' && !usedKeys.has(v.key)) {
        options.push({
          key: v.key,
          name: v.name,
          lang: 'es',
          label: 'Español'
        });
        usedKeys.add(v.key);
      }
    });

    videos.forEach(v => {
      if (!usedKeys.has(v.key)) {
        options.push({
          key: v.key,
          name: v.name,
          lang: v.iso_639_1 || 'otro',
          label: v.iso_639_1?.toUpperCase() || 'OTRO'
        });
        usedKeys.add(v.key);
      }
    });

    return options;
  }, []);

  useEffect(() => {
    if (isActive) {
      setIsAutoPlaying(false);
      trailerTimeoutRef.current = setTimeout(() => {
        const audios = organizeVideosByLanguage(currentItem);
        if (audios.length > 0) {
          setAvailableAudios(audios);
          setTrailerKey(audios[0].key);
          setShowTrailer(true);
          setShowAudioSelector(false);
          setCurrentQuality('highres');
          setPerformanceIssues(0);
          stallCount.current = 0;
          setPlayerInstance(prev => prev + 1);
        }
      }, trailerDelay);
    } else {
      setIsAutoPlaying(true);
      cleanupTrailer();
    }
    
    return () => {
      if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);
    };
  }, [isActive, currentItem, organizeVideosByLanguage, trailerDelay, cleanupTrailer]);

  const changeAudio = useCallback((index: number) => {
    cleanupTrailer();
    setSelectedAudio(index);
    setTrailerKey(availableAudios[index].key);
    setPerformanceIssues(0);
    stallCount.current = 0;
    setPlayerInstance(prev => prev + 1);
    
    setTimeout(() => {
      setShowTrailer(true);
    }, 100);
  }, [availableAudios, cleanupTrailer]);

  // INICIALIZAR PLAYER
  useEffect(() => {
    if (!showTrailer || !trailerKey || !playerContainerRef.current) return;

    const initPlayer = () => {
      if (!window.YT?.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }

      try {
        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          videoId: trailerKey,
          playerVars: {
            autoplay: 1,
            mute: isMutedRef.current ? 1 : 0,
            controls: 0,
            start: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            fs: 0,
            cc_load_policy: 0,
            hl: 'es-419',
            autohide: 1,
            disablekb: 1,
            origin: window.location.origin,
            vq: 'highres',
          },
          events: {
            onReady: (event: any) => {
              setPlayerReady(true);
              
              try {
                event.target.setPlaybackQuality('highres');
                const availableQualities = event.target.getAvailableQualityLevels?.() || [];
                
                if (!availableQualities.includes('highres') && availableQualities.length > 0) {
                  const bestQuality = availableQualities[0];
                  event.target.setPlaybackQuality(bestQuality);
                  setCurrentQuality(bestQuality);
                }
              } catch (e) {}
              
              event.target.playVideo();
              if (isMutedRef.current) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT?.PlayerState?.ENDED) {
                cleanupTrailer();
              }
              
              if (event.data === window.YT?.PlayerState?.BUFFERING) {
                stallCount.current++;
                if (stallCount.current > 5 && currentQuality === 'highres') {
                  setCurrentQuality('hd1080');
                  event.target.setPlaybackQuality?.('hd1080');
                }
              }
            },
            onPlaybackQualityChange: (event: any) => {
              setCurrentQuality(event.data);
            },
            onError: (event: any) => {
              console.error('Error del reproductor:', event.data);
              cleanupTrailer();
            }
          }
        });
      } catch (error) {
        console.error('Error inicializando player:', error);
      }
    };

    initPlayer();

    return () => {
      cleanupTrailer();
    };
  }, [showTrailer, trailerKey, playerInstance, currentQuality, cleanupTrailer]);

  useEffect(() => {
    if (isAutoPlaying && !isActive) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((p) => (p + 1) % items.length);
        cleanupTrailer();
      }, autoPlayInterval);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, isActive, items.length, autoPlayInterval, cleanupTrailer]);

  const toggleMute = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    
    if (playerRef.current && playerReady) {
      try {
        if (newState) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch (e) {}
    }
  }, [playerReady, isMuted]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((p) => (p + 1) % items.length);
    cleanupTrailer();
  }, [items.length, cleanupTrailer]);

  if (!items?.length) return null;

  const backdropUrl = `https://image.tmdb.org/t/p/original${currentItem.backdrop_path}`;
  const logoUrl = currentItem.logo_path ? `https://image.tmdb.org/t/p/original${currentItem.logo_path}` : null;
  
  const title = currentItem.displayTitle;
  const year = currentItem.displayYear;
  const duration = currentItem.displayRuntime;
  const matchPercent = getMatchPercent(currentItem.vote_average);
  const genres = currentItem.genres?.slice(0, 3) || [];
  const tmdbUrl = currentItem.tmdbUrl;

  const shouldShowLogo = logoUrl && !logoError;
  const isLogoReady = logoLoaded || (currentItem.logo_path && logoCache.has(currentItem.logo_path));

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[85vh] min-h-150 overflow-hidden bg-black focus:outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
    >
      <div className="absolute inset-0">
        <img 
          src={backdropUrl} 
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-700 ${showTrailer ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      {showTrailer && trailerKey && (
        <div className="absolute inset-0 w-full h-full bg-black" key={`player-${playerInstance}`}>
          <div 
            ref={playerContainerRef} 
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scale(1.2)', pointerEvents: 'none' }}
          />
        </div>
      )}

      <div className={`absolute inset-0 bg-linear-to-r from-black via-black/60 to-transparent transition-opacity duration-500 ${showTrailer ? 'opacity-60' : 'opacity-80'}`} />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/30" />

      <div className="absolute bottom-0 left-0 w-full pb-20 px-4 sm:px-6 lg:px-12 xl:px-16">
        <div className="max-w-2xl space-y-6">
          
          <div className="relative h-32 md:h-40 w-full max-w-lg">
            {shouldShowLogo ? (
              <img 
                key={`logo-${currentItem.id}`}
                src={logoUrl} 
                alt={title}
                className={`h-full w-auto object-contain object-left transition-all duration-500 ${
                  isLogoReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                style={{ 
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))',
                  maxWidth: '100%'
                }}
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoError(true)}
              />
            ) : (
              <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl">
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm md:text-base text-gray-200 flex-wrap">
            <span className="text-green-400 font-semibold">{matchPercent} de coincidencia</span>
            <span className="text-gray-400">•</span>
            <span>{year}</span>
            <span className="text-gray-400">•</span>
            <span className="border border-gray-500 px-1.5 py-0.5 text-xs rounded">{currentItem.ageRating || '13+'}</span>
            
            {duration && (
              <>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {duration}
                </span>
              </>
            )}
            
            <span className="text-gray-400">•</span>
            <span className="text-yellow-500 font-bold">IMDb {currentItem.vote_average.toFixed(1)}</span>
            
            {showTrailer && availableAudios.length > 1 && (
              <>
                <span className="text-gray-400">•</span>
                <div className="relative">
                  <button 
                    onClick={() => setShowAudioSelector(!showAudioSelector)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors text-xs"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{availableAudios[selectedAudio]?.label || 'Audio'}</span>
                    <ChevronDown 
                      className={`w-3 h-3 transition-transform ${showAudioSelector ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  
                  {showAudioSelector && (
                    <div className="absolute bottom-full left-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg p-2 min-w-35 z-50 border border-white/10 shadow-xl">
                      {availableAudios.map((audio, idx) => (
                        <button
                          key={audio.key}
                          onClick={() => {
                            changeAudio(idx);
                            setShowAudioSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-white/20 transition-colors flex items-center justify-between ${
                            selectedAudio === idx ? 'text-green-400 font-semibold' : 'text-white'
                          }`}
                        >
                          {audio.label}
                          {selectedAudio === idx && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {showTrailer && availableAudios.length === 1 && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-green-400 text-xs font-semibold">
                  {availableAudios[0].label}
                </span>
              </>
            )}
          </div>

          <p className="text-gray-200 text-base md:text-lg line-clamp-3 max-w-xl leading-relaxed">
            {currentItem.overview}
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            {genres.map((genre, index) => (
              <React.Fragment key={genre.id}>
                <span className="hover:text-white cursor-pointer">{genre.name}</span>
                {index < genres.length - 1 && <span>•</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <a 
              href={tmdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-semibold hover:bg-gray-200 transition-colors"
            >
              <Play className="w-5 h-5 fill-black" />
              Reproducir
            </a>
            
            <a 
              href={tmdbUrl}
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

        <div className="absolute right-4 sm:right-6 lg:right-12 bottom-20 flex items-center gap-3">
          {showTrailer && (
            <button 
              onClick={toggleMute}
              className="p-3 rounded-full border border-white/30 bg-black/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          )}
          
          <button 
            onClick={nextSlide}
            className="p-3 rounded-full border border-white/30 bg-black/30 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              cleanupTrailer();
            }}
            className={`h-1 rounded-full transition-all ${index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}