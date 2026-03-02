import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow"; // ← IMPORTADO: Añadido para filas de contenido mixto
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Home | Moonlight",
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
  mediaType: 'movie' | 'tv'; // NOTA: Mixto en home
  tmdbUrl: string;
}

// NOTA: Interfaz requerida por PosterRow - soporta ambos tipos
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
  genres?: Genre[];
  mediaType: 'movie' | 'tv'; // NOTA: Mixto en home
}

// NOTA: Función unificada para obtener contenido mixto del home
async function getHomeData() {
  if (!TMDB_API_KEY) {
    return {
      trendingData: { results: [] },
      popularMoviesData: { results: [] },
      popularTVData: { results: [] },
      topRatedMoviesData: { results: [] },
      topRatedTVData: { results: [] },
      upcomingMoviesData: { results: [] },
    };
  }

  // NOTA: 6 endpoints en paralelo para contenido mixto de home
  const [trendingRes, popularMoviesRes, popularTVRes, topRatedMoviesRes, topRatedTVRes, upcomingRes] = await Promise.all([
    // Hero: Tendencias mixtas (películas + series)
    fetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}&language=es-ES`, { next: { revalidate: 3600 } }),
    // Fila 1: Películas populares
    fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 2: Series populares
    fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 3: Películas mejor valoradas
    fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 4: Series mejor valoradas
    fetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`, { next: { revalidate: 3600 } }),
    // Fila 5: Próximos estrenos (películas)
    fetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=es-ES&region=ES&page=1`, { next: { revalidate: 3600 } }),
  ]);

  const [trendingData, popularMoviesData, popularTVData, topRatedMoviesData, topRatedTVData, upcomingMoviesData] = await Promise.all([
    trendingRes.json(),
    popularMoviesRes.json(),
    popularTVRes.json(),
    topRatedMoviesRes.json(),
    topRatedTVRes.json(),
    upcomingRes.json(),
  ]);

  return {
    trendingData,
    popularMoviesData,
    popularTVData,
    topRatedMoviesData,
    topRatedTVData,
    upcomingMoviesData,
  };
}

// NOTA: Formatea duración según tipo: "1h 30m" para pelis, "2 Temporadas" para series
function formatRuntime(item: any, mediaType: 'movie' | 'tv'): string {
  if (mediaType === 'movie') {
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

// NOTA: Convierte item de API a formato HeroCarousel con enriquecimiento completo
async function enrichHeroItem(item: any): Promise<CarouselItem> {
  const mediaType = item.media_type || 'movie';
  const isMovie = mediaType === 'movie';
  
  try {
    // NOTA: Llamadas específicas según tipo de medio
    const [videosRes, detailsRes, imagesRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/${mediaType}/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`, 
        { next: { revalidate: 86400 } }),
      fetch(`${TMDB_BASE_URL}/${mediaType}/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`, 
        { next: { revalidate: 3600 } }),
      fetch(`${TMDB_BASE_URL}/${mediaType}/${item.id}/images?api_key=${TMDB_API_KEY}`, 
        { next: { revalidate: 86400 } }),
    ]);

    const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
    const detailsData = detailsRes.ok ? await detailsRes.json() : {};
    const imagesData = imagesRes.ok ? await imagesRes.json() : { logos: [] };

    // NOTA: Selección inteligente de logo
    const logos = imagesData.logos || [];
    const esLogo = logos.find((l: any) => l.iso_639_1 === 'es');
    const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
    const logoPath = esLogo?.file_path || enLogo?.file_path || logos[0]?.file_path || '';

    // NOTA: Obtención de clasificación por edad con endpoints diferentes para movie/tv
    let ageRating = '';
    try {
      const ratingUrl = isMovie 
        ? `${TMDB_BASE_URL}/movie/${item.id}/release_dates?api_key=${TMDB_API_KEY}`
        : `${TMDB_BASE_URL}/tv/${item.id}/content_ratings?api_key=${TMDB_API_KEY}`;
      const ratingRes = await fetch(ratingUrl, { next: { revalidate: 86400 } });
      
      if (ratingRes.ok) {
        const data = await ratingRes.json();
        if (isMovie) {
          const cert = data.results?.find((r: any) => r.iso_3166_1 === 'ES')?.release_dates?.find((d: any) => d.certification)?.certification ||
                      data.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates?.find((d: any) => d.certification)?.certification || '';
          ageRating = convertToAgeFormat(cert);
        } else {
          const rating = data.results?.find((r: any) => r.iso_3166_1 === 'ES')?.rating ||
                        data.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating || '';
          ageRating = convertToAgeFormat(rating);
        }
      }
    } catch (e) { console.error(e); }

    return {
      id: item.id,
      displayTitle: isMovie ? (item.title || 'Sin título') : (item.name || 'Sin título'),
      displayYear: isMovie 
        ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
        : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
      displayRuntime: formatRuntime(detailsData, mediaType),
      overview: item.overview || '',
      backdrop_path: item.backdrop_path || '',
      poster_path: item.poster_path || '',
      vote_average: item.vote_average || 0,
      ageRating,
      logo_path: logoPath,
      genres: detailsData.genres?.slice(0, 5) || [],
      videos: videosData,
      mediaType: mediaType as 'movie' | 'tv',
      tmdbUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`, // NOTA: Corregido espacio
    };
  } catch (error) {
    console.error(`Error enriqueciendo item ${item.id}:`, error);
    return {
      id: item.id,
      displayTitle: isMovie ? (item.title || 'Sin título') : (item.name || 'Sin título'),
      displayYear: isMovie 
        ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
        : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
      displayRuntime: '',
      overview: item.overview || '',
      backdrop_path: item.backdrop_path || '',
      poster_path: item.poster_path || '',
      vote_average: item.vote_average || 0,
      ageRating: '',
      logo_path: '',
      genres: [],
      videos: { results: [] },
      mediaType: mediaType as 'movie' | 'tv',
      tmdbUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
    };
  }
}

// NOTA: Convierte item de API a formato PosterRow (versión ligera)
function toPosterItem(item: any, mediaType: 'movie' | 'tv'): PosterItem {
  const isMovie = mediaType === 'movie';
  
  return {
    id: item.id,
    title: isMovie ? (item.title || 'Sin título') : (item.name || 'Sin título'),
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    vote_average: item.vote_average || 0,
    releaseYear: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
    duration: '', // NOTA: PosterRow calculará esto dinámicamente
    ageRating: '13+',
    overview: item.overview || '',
    genres: item.genre_ids?.map((id: number) => ({ id, name: '' })) || [],
    mediaType,
  };
}

async function HomeContent() {
  const {
    trendingData,
    popularMoviesData,
    popularTVData,
    topRatedMoviesData,
    topRatedTVData,
    upcomingMoviesData,
  } = await getHomeData();

  // NOTA: Enriquecimiento paralelo de los 5 primeros items tendencias para el Hero
  const heroItems = await Promise.all(
    (trendingData?.results?.slice(0, 5) || []).map(enrichHeroItem)
  );

  // NOTA: Mapeo directo a PosterItem para las filas (sin enriquecimiento adicional)
  const popularMovies = popularMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const popularTV = popularTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const topRatedMovies = topRatedMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const topRatedTV = topRatedTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const upcomingMovies = upcomingMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];

  if (!heroItems || heroItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No se pudo cargar el contenido</h1>
          <p className="text-gray-400">Verifica tu conexión y la API key de TMDB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* 
        NOTA: HeroCarousel muestra contenido mixto (películas y series juntas)
        El mediaType="movie" es solo un default, cada item tiene su mediaType real
      */}
      <HeroCarousel
        items={heroItems}
        mediaType="movie"
        autoPlayInterval={8000}
        trailerDelay={5000}
      />
      
      {/* 
        NOTA: Contenedor de filas PosterRow con contenido mixto organizado:
        - Primero populares (pelis y series)
        - Luego mejor valoradas (pelis y series)  
        - Al final próximos estrenos (solo pelis)
      */}
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        <PosterRow title="Películas Populares" items={popularMovies} mediaType="movie" />
        <PosterRow title="Series Populares" items={popularTV} mediaType="tv" />
        <PosterRow title="Películas Mejor Valoradas" items={topRatedMovies} mediaType="movie" />
        <PosterRow title="Series Mejor Valoradas" items={topRatedTV} mediaType="tv" />
        <PosterRow title="Próximos Estrenos" items={upcomingMovies} mediaType="movie" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-black">
      <Suspense fallback={<MediaLoader type="movies" />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}