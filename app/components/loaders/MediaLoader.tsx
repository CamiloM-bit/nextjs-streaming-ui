'use client';

import React from 'react';

interface MediaLoaderProps {
  type?: 'movies' | 'series' | 'new-popular';
}

export default function MediaLoader({ type = 'movies' }: MediaLoaderProps) {
  const titles = {
    movies: 'Cargando Películas',
    series: 'Cargando Series',
    'new-popular': 'Cargando'
  };

  return (
    <div className="relative w-full h-[85vh] min-h-150 bg-black flex flex-col items-center justify-center gap-8">
      {/* Aro rojo girando */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 animate-spin" 
          style={{ animationDuration: '1s' }}
        />
      </div>

      {/* Texto Cargando */}
      <p className="text-white text-lg font-medium tracking-wide">
        {titles[type]}
      </p>
    </div>
  );
}