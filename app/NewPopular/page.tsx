import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow"; // ← IMPORTADO: Componente de filas de pósters
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Nuevas y Populares | Moonlight",
};

const TMDB_API_KEY = process.env.TMDB_API_KEY;
// NOTA: Corregido espacio en blanco al final de la URL base
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface HeroItem {
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
  genres?: { id: number; name: string }[];
  videos?: { results: any[] };
  mediaType: 'movie' | 'tv';
  tmdbUrl: string;
}

// NOTA: Interfaz requerida por el componente PosterRow
interface PosterItem {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  releaseYear: string;
  duration: string;
  ageRating?: string;
  overview: string;
  genres?: { id: number; name: string }[];
  mediaType: 'movie' | 'tv';
}

// NOTA: Función mejorada para obtener datos de múltiples endpoints en paralelo
// Se añaden endpoints para contenido popular además de nuevos lanzamientos
async function getNewPopularData() {
  if (!TMDB_API_KEY) return { 
    heroData: { results: [] }, 
    newMoviesData: { results: [] }, 
    newTVData: { results: [] }, 
    upcomingData: { results: [] },
    popularMoviesData: { results: [] }, // ← NUEVO: Para fila adicional de populares
    popularTVData: { results: [] }      // ← NUEVO: Para fila adicional de series populares
  };

  // NOTA: Promise.all para paralelizar todas las llamadas a la API
  const [heroRes, newMoviesRes, newTVRes, upcomingRes, popularMoviesRes, popularTVRes] = await Promise.all([
    // Hero: Tendencias del día (mixto películas + series)
    fetch(`${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=es-ES`, { next: { revalidate: 1800 } }),
    // Fila 1: Estrenos en cines (ES)
    fetch(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=es-ES&region=ES`, { next: { revalidate: 3600 } }),
    // Fila 2: Series en emisión
    fetch(`${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=es-ES`, { next: { revalidate: 3600 } }),
    // Fila 3: Próximos estrenos
    fetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=es-ES&region=ES`, { next: { revalidate: 3600 } }),
    // Fila 4: Películas populares (globales)
    fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 5: Series populares
    fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
  ]);

  const [heroData, newMoviesData, newTVData, upcomingData, popularMoviesData, popularTVData] = await Promise.all([
    heroRes.json(),
    newMoviesRes.json(),
    newTVRes.json(),
    upcomingRes.json(),
    popularMoviesRes.json(),
    popularTVRes.json(),
  ]);

  return { heroData, newMoviesData, newTVData, upcomingData, popularMoviesData, popularTVData };
}

// NOTA: Función helper para formatear duración según tipo de medio
function formatRuntime(item: any, isMovie: boolean): string {
  if (isMovie) {
    const runtime = item.runtime || 0;
    if (runtime === 0) return '';
    const hours = Math.floor(runtime / 60);
    const mins = runtime % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else {
    const seasons = item.number_of_seasons || 0;
    return seasons > 0 ? `${seasons} Temporada${seasons > 1 ? 's' : ''}` : '';
  }
}

// NOTA: Convierte respuesta de API al formato que espera HeroCarousel
function toHeroItem(item: any): HeroItem {
  const isMovie = item.media_type === 'movie';
  
  return {
    id: item.id,
    displayTitle: isMovie ? item.title : item.name,
    displayYear: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
    displayRuntime: formatRuntime(item, isMovie),
    overview: item.overview,
    backdrop_path: item.backdrop_path,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    ageRating: '13+',
    logo_path: item.logo_path,
    genres: item.genres,
    videos: item.videos,
    mediaType: isMovie ? 'movie' : 'tv',
    tmdbUrl: `https://www.themoviedb.org/${item.media_type}/${item.id}`, // NOTA: Corregido espacio en URL
  };
}

// NOTA: Convierte respuesta de API al formato que espera PosterRow
function toPosterItem(item: any, isMovie: boolean): PosterItem {
  const runtime = formatRuntime(item, isMovie);
  
  return {
    id: item.id,
    title: isMovie ? item.title : item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average,
    releaseYear: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
    duration: runtime,
    ageRating: '13+',
    overview: item.overview,
    genres: item.genres,
    mediaType: isMovie ? 'movie' : 'tv',
  };
}

async function NewPopularContent() {
  // NOTA: Desestructuración de todos los datos obtenidos
  const { heroData, newMoviesData, newTVData, upcomingData, popularMoviesData, popularTVData } = await getNewPopularData();

  // NOTA: Mapeo de datos a los formatos correctos para cada componente
  const heroItems = heroData?.results?.slice(0, 5).map(toHeroItem) || [];
  const newMovies = newMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, true)) || [];
  const newTV = newTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, false)) || [];
  const comingSoon = upcomingData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, true)) || [];
  const popularMovies = popularMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, true)) || [];
  const popularTV = popularTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, false)) || [];

  return (
    <div className="min-h-screen bg-black">
      {/* NOTA: HeroCarousel muestra tendencias mixtas (películas + series) */}
      <HeroCarousel items={heroItems} />
      
      {/* 
        NOTA: Contenedor de filas PosterRow con:
        - relative z-20: Para posicionar sobre el hero con z-index alto
        - -mt-20: Margen negativo para solapamiento estilo Netflix
        - space-y-8: Espaciado vertical entre filas
        - pb-12: Padding inferior para respiración al final de página
      */}
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        {/* NOTA: Orden de filas: Populares primero, luego nuevos, luego próximos */}
        <PosterRow title="Películas Populares" items={popularMovies} mediaType="movie" />
        <PosterRow title="Series Populares" items={popularTV} mediaType="tv" />
        <PosterRow title="Nuevos Lanzamientos" items={newMovies} mediaType="movie" />
        <PosterRow title="Nuevas Series" items={newTV} mediaType="tv" />
        <PosterRow title="Próximamente en Cines" items={comingSoon} mediaType="movie" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<MediaLoader type="movies" />}>
      <NewPopularContent />
    </Suspense>
  );
}