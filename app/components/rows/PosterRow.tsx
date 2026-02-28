'use client';

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react';

interface Genre {
  id: number;
  name: string;
}

interface PosterItem {
  id: number;
  title: string; // Título a mostrar (película o serie)
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  releaseYear: string; // Año formateado
  duration: string; // "2h 15m" o "3 Temporadas"
  ageRating?: string;
  overview: string;
  genres?: Genre[];
  mediaType: 'movie' | 'tv';
}

interface PosterRowProps {
  title: string; // Título de la sección: "Acción", "Aventura", "Tendencias", etc.
  items: PosterItem[];
  visibleItems?: number; // Cuántos items visibles a la vez (default 6)
}

export default function PosterRow({ 
  title, 
  items, 
  visibleItems = 6 
}: PosterRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8
        : scrollLeft + clientWidth * 0.8;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
      setScrollPosition(scrollTo);
    }
  };

  const getMatchPercent = (rating: number): string => {
    const match = Math.min(98, Math.round((rating / 10) * 100));
    return `${match}%`;
  };

  if (!items?.length) return null;

  return (
    <div className="relative w-full px-4 sm:px-6 lg:px-12 py-6 group/row">
      {/* Título de la sección */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-2">
          {title}
          <ChevronRight className="w-5 h-5 opacity-0 group-hover/row:opacity-100 transition-opacity" />
        </h2>
        <span className="text-sm text-gray-400 opacity-0 group-hover/row:opacity-100 transition-opacity">
          Explorar todo
        </span>
      </div>

      {/* Contenedor del carrusel */}
      <div className="relative group/slider">
        {/* Botón izquierda */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-40 w-12 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity disabled:opacity-0"
          style={{ height: '100%' }}
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        {/* Botón derecha */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-40 w-12 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
          style={{ height: '100%' }}
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

        {/* Carrusel de posters */}
        <div
          ref={rowRef}
          className="flex gap-2 overflow-x-scroll scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => {
            const isHovered = hoveredIndex === index;
            
            return (
              <div
                key={item.id}
                className="relative flex-none w-[calc(100%/2)] sm:w-[calc(100%/3)] md:w-[calc(100%/4)] lg:w-[calc(100%/5)] xl:w-[calc(100%/6)] aspect-[2/3] cursor-pointer transition-all duration-300 ease-out"
                style={{
                  transform: isHovered ? 'scale(1.3) translateY(-10px)' : 'scale(1)',
                  zIndex: isHovered ? 50 : 10,
                }}
                onMouseEnter={() => {
                  setHoveredItem(item.id);
                  setHoveredIndex(index);
                }}
                onMouseLeave={() => {
                  setHoveredItem(null);
                  setHoveredIndex(null);
                }}
              >
                {/* Imagen del poster */}
                <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-800">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Overlay en hover */}
                  {isHovered && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col justify-between p-3 animate-in fade-in duration-200">
                      {/* Imagen pequeña arriba */}
                      <div className="relative h-24 w-full rounded overflow-hidden">
                        <img
                          src={`https://image.tmdb.org/t/p/w300${item.backdrop_path || item.poster_path}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>

                      {/* Info */}
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

                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <span className="text-green-400 font-semibold">{getMatchPercent(item.vote_average)} de coincidencia</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                          <span className="border border-gray-500 px-1 rounded text-[10px]">{item.ageRating || '13+'}</span>
                          <span>{item.duration}</span>
                          <span className="text-[10px] border border-gray-500 px-1 rounded">HD</span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {item.genres?.slice(0, 3).map((genre) => (
                            <span key={genre.id} className="text-[10px] text-gray-400">
                              {genre.name}{' '}
                            </span>
                          ))}
                        </div>
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
  );
}