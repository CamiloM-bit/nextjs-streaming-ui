import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow"; // ← IMPORTADO: Añadido para filas de series
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Series | Moonlight",
};

const TMDB_API_KEY = process.env.TMDB_API_KEY;
// NOTA: Corregido espacio en blanco al final de la URL base
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

// Interfaz que espera el HeroCarousel
interface CarouselItem {
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
  mediaType: 'tv'; // NOTA: Siempre 'tv' en esta página
  tmdbUrl: string;
}

// NOTA: Interfaz requerida por PosterRow para mostrar series
interface PosterItem {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  releaseYear: string;
  duration: string; // NOTA: Para series muestra "X Temporadas"
  ageRating?: string;
  overview: string;
  genres?: Genre[];
  mediaType: 'tv'; // NOTA: Siempre 'tv' en esta página
}

// NOTA: Función unificada para obtener todas las series (hero + filas)
async function getSeriesData() {
  if (!TMDB_API_KEY) {
    return { 
      heroSeries: [], 
      popularSeries: [], 
      topRatedSeries: [], 
      onTheAirSeries: [], 
      airingTodaySeries: [] 
    };
  }

  // NOTA: Paralelización de 5 endpoints de series
  const [trendingRes, popularRes, topRatedRes, onTheAirRes, airingTodayRes] = await Promise.all([
    // Hero: Series en tendencia esta semana
    fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=es-ES`, { next: { revalidate: 3600 } }),
    // Fila 1: Series populares
    fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 2: Mejor valoradas
    fetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 3: En emisión (con episodios recientes)
    fetch(`${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 4: Emitiéndose hoy
    fetch(`${TMDB_BASE_URL}/tv/airing_today?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
  ]);

  const [trendingData, popularData, topRatedData, onTheAirData, airingTodayData] = await Promise.all([
    trendingRes.json(),
    popularRes.json(),
    topRatedRes.json(),
    onTheAirRes.json(),
    airingTodayRes.json(),
  ]);

  return { 
    trendingData, 
    popularData, 
    topRatedData, 
    onTheAirData, 
    airingTodayData 
  };
}

// NOTA: Formatea número de temporadas para mostrar en UI
function formatSeasons(item: any): string {
  const seasons = item.number_of_seasons || 0;
  return seasons > 0 ? `${seasons} Temporada${seasons > 1 ? 's' : ''}` : '';
}

function convertToAgeFormat(cert: string): string {
  if (!cert) return '';
  const ageMap: { [key: string]: string } = {
    'APTA': '0+', 'G': '0+', 'TV-Y': '0+', 'TV-G': '0+',
    '7': '7+', 'PG': '7+', 'TV-Y7': '7+', 'TV-PG': '7+',
    '12': '12+', 'PG-13': '12+',
    '14': '14+', 'TV-14': '14+',
    '16': '16+', 'R': '16+',
    '18': '18+', 'NC-17': '18+', 'TV-MA': '18+',
  };
  return ageMap[cert] || cert;
}

// NOTA: Convierte datos de API a formato HeroCarousel (con enriquecimiento de datos)
async function enrichHeroItem(item: any): Promise<CarouselItem> {
  try {
    // NOTA: Obtención de datos adicionales para el hero (videos, logos, clasificación)
    const [videosRes, detailsRes, imagesRes, contentRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/tv/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`,
        { next: { revalidate: 86400 } }),
      fetch(`${TMDB_BASE_URL}/tv/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`,
        { next: { revalidate: 3600 } }),
      fetch(`${TMDB_BASE_URL}/tv/${item.id}/images?api_key=${TMDB_API_KEY}`,
        { next: { revalidate: 86400 } }),
      fetch(`${TMDB_BASE_URL}/tv/${item.id}/content_ratings?api_key=${TMDB_API_KEY}`,
        { next: { revalidate: 86400 } }),
    ]);

    const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
    const detailsData = detailsRes.ok ? await detailsRes.json() : {};
    const imagesData = imagesRes.ok ? await imagesRes.json() : { logos: [] };
    const contentData = contentRes.ok ? await contentRes.json() : { results: [] };

    // NOTA: Selección de logo preferido (ES > EN > primero disponible)
    const logos = imagesData.logos || [];
    const esLogo = logos.find((l: any) => l.iso_639_1 === 'es');
    const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
    const logoPath = esLogo?.file_path || enLogo?.file_path || logos[0]?.file_path || '';

    // NOTA: Obtención de clasificación por edad (ES > US)
    const rating = contentData.results?.find((r: any) => r.iso_3166_1 === 'ES')?.rating ||
      contentData.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating || '';
    const ageRating = convertToAgeFormat(rating);

    return {
      id: item.id,
      displayTitle: item.name || 'Sin título',
      displayYear: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '',
      displayRuntime: formatSeasons(detailsData),
      overview: item.overview || '',
      backdrop_path: item.backdrop_path || '',
      poster_path: item.poster_path || '',
      vote_average: item.vote_average || 0,
      ageRating,
      logo_path: logoPath,
      genres: detailsData.genres?.slice(0, 5) || [],
      videos: videosData,
      mediaType: 'tv' as const,
      tmdbUrl: `https://www.themoviedb.org/tv/${item.id}`, // NOTA: Corregido espacio
    };
  } catch (error) {
    console.error(`Error enriqueciendo serie ${item.id}:`, error);
    return {
      id: item.id,
      displayTitle: item.name || 'Sin título',
      displayYear: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '',
      displayRuntime: '',
      overview: item.overview || '',
      backdrop_path: item.backdrop_path || '',
      poster_path: item.poster_path || '',
      vote_average: item.vote_average || 0,
      ageRating: '',
      logo_path: '',
      genres: [],
      videos: { results: [] },
      mediaType: 'tv' as const,
      tmdbUrl: `https://www.themoviedb.org/tv/${item.id}`,
    };
  }
}

// NOTA: Convierte datos de API a formato PosterRow (versión ligera sin enriquecimiento)
function toPosterItem(item: any): PosterItem {
  return {
    id: item.id,
    title: item.name || 'Sin título',
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    vote_average: item.vote_average || 0,
    releaseYear: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '',
    duration: '', // NOTA: PosterRow fetcheará esto automáticamente con su hook interno
    ageRating: '13+',
    overview: item.overview || '',
    genres: item.genre_ids?.map((id: number) => ({ id, name: '' })) || [],
    mediaType: 'tv' as const,
  };
}

async function SeriesContent() {
  const { trendingData, popularData, topRatedData, onTheAirData, airingTodayData } = await getSeriesData();

  // NOTA: Enriquecimiento paralelo de los 5 primeros items para el HeroCarousel
  const heroItems = await Promise.all(
    (trendingData?.results?.slice(0, 5) || []).map(enrichHeroItem)
  );

  // NOTA: Mapeo directo a PosterItem para las filas (más ligero, sin llamadas adicionales)
  const popularSeries = popularData?.results?.slice(0, 15).map(toPosterItem) || [];
  const topRatedSeries = topRatedData?.results?.slice(0, 15).map(toPosterItem) || [];
  const onTheAirSeries = onTheAirData?.results?.slice(0, 15).map(toPosterItem) || [];
  const airingTodaySeries = airingTodayData?.results?.slice(0, 15).map(toPosterItem) || [];

  if (!heroItems || heroItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No se pudieron cargar las series</h1>
          <p className="text-gray-400">Verifica tu conexión y la API key de TMDB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* NOTA: HeroCarousel con configuración específica para series */}
      <HeroCarousel
        items={heroItems}
        mediaType="tv"
        autoPlayInterval={8000}
        trailerDelay={5000}
      />
      
      {/* 
        NOTA: Contenedor de filas PosterRow específico para series
        Todas las filas usan mediaType="tv" para mostrar "X Temporadas" en lugar de duración
      */}
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        <PosterRow title="Series Populares" items={popularSeries} mediaType="tv" />
        <PosterRow title="Mejor Valoradas" items={topRatedSeries} mediaType="tv" />
        <PosterRow title="En Emisión" items={onTheAirSeries} mediaType="tv" />
        <PosterRow title="Emitiéndose Hoy" items={airingTodaySeries} mediaType="tv" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<MediaLoader type="series" />}>
      <SeriesContent />
    </Suspense>
  );
}