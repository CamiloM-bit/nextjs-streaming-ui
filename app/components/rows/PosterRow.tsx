'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, ThumbsUp, ChevronDown, X, Clock, Calendar } from 'lucide-react';

interface Genre {
  id: number;
  name: string;
}

export interface PosterItem {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  releaseYear: string;
  duration: string;
  ageRating?: string;
  overview: string;
  genres?: Genre[];
  mediaType: 'movie' | 'tv';
}

interface PosterRowProps {
  title: string;
  items: PosterItem[];
  visibleItems?: number;
  exploreUrl?: string;
  genreId?: number;
  mediaType?: 'movie' | 'tv';
}

export default function PosterRow({ 
  title, 
  items, 
  visibleItems = 6,
  exploreUrl,
  genreId,
  mediaType = 'movie'
}: PosterRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemDetails, setItemDetails] = useState<Map<number, { runtime?: number; number_of_seasons?: number; overview?: string }>>(new Map());

  const displayItems = items.slice(0, 15);

  const scrollToItem = useCallback((direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    
    const container = rowRef.current;
    const scrollAmount = container.clientWidth * 0.9;
    
    container.scrollTo({ 
      left: direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount, 
      behavior: 'smooth' 
    });
  }, []);

  // Fetch detalles cuando se hace hover
  const fetchItemDetails = useCallback(async (item: PosterItem) => {
    if (itemDetails.has(item.id)) return;
    
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${item.mediaType}/${item.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=es-ES`
      );
      if (!res.ok) return;
      
      const data = await res.json();
      const details = {
        runtime: data.runtime,
        number_of_seasons: data.number_of_seasons,
        overview: data.overview,
      };
      
      setItemDetails(prev => new Map(prev).set(item.id, details));
    } catch (e) {
      console.log('Error fetching details:', item.title);
    }
  }, [itemDetails]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const item = displayItems[hoveredIndex];
      if (item && !itemDetails.has(item.id)) {
        fetchItemDetails(item);
      }
    }
  }, [hoveredIndex, displayItems, itemDetails, fetchItemDetails]);

  // Navegación teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) {
        if (e.key === 'Escape') {
          setIsModalOpen(false);
          document.body.style.overflow = 'unset';
        }
        return;
      }

      if (!rowRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const isInViewport = rect.top >= -100 && rect.bottom <= window.innerHeight + 100;
      
      if (!isInViewport) return;

      switch(e.key) {
        case 'ArrowRight':
          e.preventDefault();
          scrollToItem('right');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          scrollToItem('left');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, scrollToItem]);

  const getMatchPercent = (rating: number): string => {
    const match = Math.min(98, Math.round((rating / 10) * 100));
    return `${match}%`;
  };

  const formatDuration = (item: PosterItem): string => {
    if (item.duration) return item.duration;
    
    const details = itemDetails.get(item.id);
    if (!details) return '';
    
    if (item.mediaType === 'movie') {
      const runtime = details.runtime;
      if (!runtime) return '';
      const hours = Math.floor(runtime / 60);
      const mins = runtime % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } else {
      const seasons = details.number_of_seasons;
      if (!seasons) return '';
      return `${seasons} Temporada${seasons > 1 ? 's' : ''}`;
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  if (!items?.length) return null;

  return (
    <>
      <div className="relative w-full px-4 sm:px-6 lg:px-12 py-6 group/row">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-white hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-2 group/title">
            {title}
            <ChevronRight className="w-5 h-5 opacity-0 group-hover/title:opacity-100 transition-opacity" />
          </h2>
          <button 
            onClick={openModal}
            className="text-sm text-gray-400 opacity-0 group-hover/row:opacity-100 transition-opacity hover:text-white ml-auto flex items-center gap-1"
          >
            Explorar todo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="relative group/slider">
          <button
            onClick={() => scrollToItem('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-990 w-12 border-white border rounded-[100px] bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
            style={{ height: '40px', width: '40px' }}
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={() => scrollToItem('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2  z-990 w-12  center border-white border rounded-[100px] bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
            style={{ height: '40px', width: '40px' }}
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          <div
            ref={rowRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide  scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayItems.map((item, index) => {
              const isHovered = hoveredIndex === index;
              const duration = formatDuration(item);
              const details = itemDetails.get(item.id);
              const overview = details?.overview || item.overview;
              
              return (
                <div
                  key={`${item.id}-${index}`}
                  className="relative flex-none w-[calc(100%/2)] sm:w-[calc(100%/3)] md:w-[calc(100%/4)] lg:w-[calc(100%/5)] xl:w-[calc(100%/6)] aspect-2/3 cursor-pointer transition-all duration-300 ease-out snap-start"
                  style={{
                    transform: isHovered ? 'w-[100px]' : 'w-auto',
                    zIndex: isHovered ? 50 : 10,
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => window.open(`https://www.themoviedb.org/${item.mediaType}/${item.id}`, '_blank')}
                >
                  <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-800">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {index < 10 && (
                      <div className="absolute -left-2 bottom-0 text-6xl font-black text-black/80 italic" 
                           style={{ WebkitTextStroke: '2px #4a4a4a' }}>
                        {index + 1}
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                      {duration && (
                        <p className="text-gray-300 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {duration}
                        </p>
                      )}
                    </div>
                    
                    {isHovered && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col justify-between p-3 animate-in fade-in duration-200">
                       
                          <h3 className="text-white font-bold text-[25px] text-lg text-left line-clamp-2">{item.title}</h3>
                          
                         

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <button className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <Play className="w-4 h-4 text-black fill-black" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center transition-colors">
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center transition-colors">
                              <ThumbsUp className="w-4 h-4 text-white" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center transition-colors ml-auto">
                              <ChevronDown className="w-4 h-4 text-white" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                            <span className="text-green-400 font-semibold">{getMatchPercent(item.vote_average)}</span>
                            {duration && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {duration}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="border border-gray-500 px-1 rounded text-[10px]">{item.ageRating || '13+'}</span>
                            <span className="text-[10px] border border-gray-500 px-1 rounded">HD</span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {item.genres?.slice(0, 3).map((genre) => (
                              <span key={genre.id} className="text-[10px] text-gray-400">
                                {genre.name}
                              </span>
                            ))}
                          </div>

                           {overview && (
                            <p className="text-[12px] text-gray-300 line-clamp-2 leading-relaxed">
                              {overview}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed z-50 h-full  bg-black/95 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button 
              onClick={closeModal}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item) => {
                const duration = formatDuration(item);
                
                return (
                  <div
                    key={`modal-${item.id}`}
                    className="relative aspect-2/3 cursor-pointer group/item"
                    onClick={() => window.open(`https://www.themoviedb.org/${item.mediaType}/${item.id}`, '_blank')}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title}
                      className="w-full h-full object-cover rounded-md transition-transform duration-300 group-hover/item:scale-105"
                      loading="lazy"
                    />
                    
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity rounded-md flex flex-col justify-end p-3">
                      <h3 className="text-white font-semibold text-sm line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-300 flex-wrap">
                        <span className="text-green-400">{getMatchPercent(item.vote_average)}</span>
                        {duration && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {duration}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 bg-linear-to-t from-black to-transparent h-20 pointer-events-none" />
        </div>
      )}
    </>
  );
}