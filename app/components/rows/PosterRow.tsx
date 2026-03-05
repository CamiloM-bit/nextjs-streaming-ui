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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  // Crear array infinito duplicando items
  const infiniteItems = [...items, ...items, ...items];
  const displayItems = infiniteItems.slice(0, 45); 

  const getItemWidth = useCallback(() => {
    if (!rowRef.current) return 0;
    const container = rowRef.current;
    const firstItem = container.querySelector('[data-item-index]') as HTMLElement;
    return firstItem ? firstItem.offsetWidth + 8 : 0; 
  }, []);

  const checkPosition = useCallback(() => {
    if (!rowRef.current) return;
    const container = rowRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = getItemWidth();
    const threshold = 10;
    
    const startPosition = items.length * itemWidth;
    const endPosition = (items.length * 2 - visibleItems) * itemWidth;
    
    setIsAtStart(scrollLeft <= startPosition + threshold);
    setIsAtEnd(scrollLeft >= endPosition - threshold);
  }, [items.length, visibleItems, getItemWidth]);

  const scrollToItem = useCallback((direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    
    const itemWidth = getItemWidth();
    const container = rowRef.current;
    const maxIndex = items.length;
    
    let newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0) {
      newIndex = maxIndex - 1;
      container.style.scrollBehavior = 'auto';
      const scrollPosition = (items.length * 2 - 1) * itemWidth;
      container.scrollLeft = scrollPosition;
      requestAnimationFrame(() => {
        container.style.scrollBehavior = 'smooth';
        container.scrollTo({
          left: (items.length * 2 - 2) * itemWidth,
          behavior: 'smooth'
        });
        setTimeout(() => checkPosition(), 50);
      });
    } else if (newIndex >= maxIndex) {
      newIndex = 0;
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = items.length * itemWidth;
      requestAnimationFrame(() => {
        container.style.scrollBehavior = 'smooth';
        container.scrollTo({
          left: (items.length + 1) * itemWidth,
          behavior: 'smooth'
        });
        setTimeout(() => checkPosition(), 50);
      });
    } else {
      const scrollPosition = (items.length + newIndex) * itemWidth;
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
      setTimeout(() => checkPosition(), 300);
    }
    
    setCurrentIndex(newIndex);
  }, [currentIndex, items.length, getItemWidth, checkPosition]);

  useEffect(() => {
    const container = rowRef.current;
    if (!container) return;
    const handleScroll = () => checkPosition();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkPosition]);

  useEffect(() => {
    if (rowRef.current && items.length > 0) {
      const itemWidth = getItemWidth();
      rowRef.current.scrollLeft = items.length * itemWidth;
      checkPosition();
    }
  }, [items.length, getItemWidth, checkPosition]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) {
        if (e.key === 'Escape') closeModal();
        return;
      }
      if (!rowRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const isInViewport = rect.top >= -100 && rect.bottom <= window.innerHeight + 100;
      if (!isInViewport) return;

      if (e.key === 'ArrowRight') { e.preventDefault(); if (!isAtEnd) scrollToItem('right'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (!isAtStart) scrollToItem('left'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, scrollToItem, isAtStart, isAtEnd]);

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
      return seasons ? `${seasons} Temporada${seasons > 1 ? 's' : ''}` : '';
    }
  };

  const openModal = () => { setIsModalOpen(true); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { setIsModalOpen(false); document.body.style.overflow = 'unset'; };

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
          <div className={`absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-black via-black/80 to-transparent z-20 pointer-events-none transition-opacity duration-500 ${isAtStart ? 'opacity-0' : 'opacity-100'}`} />
          <div className={`absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-black via-black/80 to-transparent z-20 pointer-events-none transition-opacity duration-500 ${isAtEnd ? 'opacity-0' : 'opacity-100'}`} />

          <button
            onClick={() => scrollToItem('left')}
            disabled={isAtStart}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 border-white border rounded-full flex items-center justify-center transition-all duration-300 ${
              isAtStart ? 'opacity-30 cursor-not-allowed bg-black/30' : 'opacity-0 group-hover/slider:opacity-100 bg-black/50 hover:bg-black/70'
            }`}
          >
            <ChevronLeft className={`w-8 h-8 ${isAtStart ? 'text-gray-500' : 'text-white'}`} />
          </button>

          <button
            onClick={() => scrollToItem('right')}
            disabled={isAtEnd}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 border-white border rounded-full flex items-center justify-center transition-all duration-300 ${
              isAtEnd ? 'opacity-30 cursor-not-allowed bg-black/30' : 'opacity-0 group-hover/slider:opacity-100 bg-black/50 hover:bg-black/70'
            }`}
          >
            <ChevronRight className={`w-8 h-8 ${isAtEnd ? 'text-gray-500' : 'text-white'}`} />
          </button>

          <div
            ref={rowRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
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
                  data-item-index={index}
                  className="relative flex-none w-[calc(100%/2)] sm:w-[calc(100%/3)] md:w-[calc(100%/4)] lg:w-[calc(100%/5)] xl:w-[calc(100%/6)] aspect-2/3 cursor-pointer snap-start transition-all duration-300"
                  style={{ zIndex: isHovered ? 50 : 10 }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => window.open(`https://www.themoviedb.org/${item.mediaType}/${item.id}`, '_blank')}
                >
                  <div className={`relative w-full h-full rounded-md overflow-hidden bg-gray-800 transition-all duration-500 ease-out ${isHovered ? 'scale-105 shadow-2xl ring-1 ring-white/20' : 'scale-100'}`}>
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title}
                      className={`w-full h-full object-cover transition-all duration-500 ${isHovered ? 'brightness-110' : 'brightness-100'}`}
                      loading="lazy"
                    />
                    
                    {/* SE ELIMINÓ EL BLOQUE DE NUMERACIÓN AQUÍ */}

                    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                    </div>
                    
                    {isHovered && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col justify-between p-3 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-white font-bold text-[20px] leading-tight line-clamp-2">{item.title}</h3>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <Play className="w-4 h-4 text-black fill-black" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center transition-colors">
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center transition-colors ml-auto">
                              <ChevronDown className="w-4 h-4 text-white" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                            <span className="text-green-400 font-semibold">{getMatchPercent(item.vote_average)}</span>
                            {duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{duration}</span>}
                            <span className="border border-gray-500 px-1 rounded text-[10px]">{item.ageRating || '13+'}</span>
                            <span className="text-[10px] border border-gray-500 px-1 rounded">HD</span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {item.genres?.slice(0, 3).map((genre) => (
                              <span key={genre.id} className="text-[10px] text-gray-400">{genre.name}</span>
                            ))}
                          </div>

                          {overview && (
                            <p className="text-[11px] text-gray-300 line-clamp-3 leading-relaxed">
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
        <div className="fixed inset-0 z-50 bg-black/95 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button onClick={closeModal} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6 text-white" /></button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item) => (
                <div
                  key={`modal-${item.id}`}
                  className="relative aspect-2/3 cursor-pointer group/item overflow-hidden rounded-md"
                  onClick={() => window.open(`https://www.themoviedb.org/${item.mediaType}/${item.id}`, '_blank')}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <h3 className="text-white font-semibold text-sm line-clamp-2">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}