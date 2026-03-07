// app/milista/page.tsx (o pages/milista.tsx según tu estructura)
'use client';

import { useState, useEffect } from 'react';
import { Trash2, Play, Info, Calendar, Clock, Star } from 'lucide-react';
import Link from 'next/link';

// Mismo interface que en PosterRow
interface Genre {
  id: number;
  name: string;
}

interface MyListItem {
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
  addedAt?: string;
}

export default function MiListaPage() {
  const [myList, setMyList] = useState<MyListItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('myList');
    if (saved) {
      try {
        setMyList(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing myList:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const removeFromList = (id: number) => {
    const newList = myList.filter(item => item.id !== id);
    setMyList(newList);
    localStorage.setItem('myList', JSON.stringify(newList));
  };

  const clearList = () => {
    if (confirm('¿Estás seguro de que quieres vaciar tu lista?')) {
      setMyList([]);
      localStorage.removeItem('myList');
    }
  };

  if (!isLoaded) {
    return (
      <section className="min-h-screen bg-black w-full overflow-y-auto pt-20 px-4 sm:px-6 lg:px-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black-800 rounded w-48"></div>
          <div className="h-4 bg-black-800 rounded w-64"></div>
        </div>
      </section>
    );
  }

  const itemCount = myList.length;

  return (
    <section className="min-h-screen bg-[#000000] w-full overflow-y-auto pt-20 pb-12 px-4 sm:px-6 lg:px-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Mi Lista</h1>
            <p className="text-gray-400">
              Tienes <span className="font-bold text-white">{itemCount} {itemCount === 1 ? 'título' : 'títulos'}</span> esperando ser vistos
            </p>
          </div>
          
          {itemCount > 0 && (
            <button
              onClick={clearList}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors border border-gray-700 hover:border-red-500 rounded"
            >
              <Trash2 className="w-4 h-4" />
              Vaciar lista
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {itemCount === 0 ? (
          // Estado vacío
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-gray-800 flex items-center justify-center">
              <Play className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No hay nada en tu lista</h2>
            <p className="text-gray-400 max-w-md mb-8">
              Añade películas y series que quieras ver más tarde. 
              Haz clic en el botón + en cualquier título para agregarlo aquí.
            </p>
            <Link 
              href="/"
              className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors"
            >
              Explorar contenido
            </Link>
          </div>
        ) : (
          // Grid de items
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {myList.map((item) => (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="relative aspect-2/3 rounded-md overflow-hidden bg-gray-800 cursor-pointer transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Overlay en hover */}
                  <div className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${hoveredId === item.id ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                          <span className="text-green-400 font-semibold">
                            {Math.min(98, Math.round((item.vote_average / 10) * 100))}% match
                          </span>
                          <span>•</span>
                          <span>{item.releaseYear}</span>
                          <span>•</span>
                          <span className="border border-gray-500 px-1 rounded text-[10px]">
                            {item.ageRating || '13+'}
                          </span>
                        </div>

                        {item.duration && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                            <Clock className="w-3 h-3" />
                            {item.duration}
                          </div>
                        )}

                        <p className="text-xs text-gray-400 line-clamp-3">
                          {item.overview}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-2 rounded font-semibold text-sm hover:bg-gray-200 transition-colors"
                        >
                          <Play className="w-4 h-4 fill-black" />
                          Ver
                        </a>
                        
                        <button
                          onClick={() => removeFromList(item.id)}
                          className="p-2 rounded bg-gray-700 hover:bg-red-600 transition-colors"
                          title="Eliminar de Mi Lista"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info debajo del poster */}
                <div className="mt-2 px-1">
                  <h4 className="text-white text-sm font-medium truncate group-hover:text-gray-300 transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{item.mediaType === 'movie' ? 'Película' : 'Serie'}</span>
                    {item.addedAt && (
                      <>
                        <span>•</span>
                        <span>Añadido {new Date(item.addedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}