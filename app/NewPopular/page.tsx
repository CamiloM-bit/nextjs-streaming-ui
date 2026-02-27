import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Nuevas y Populares | Moonlight",
  description: "Descubre lo más popular y nuevo en Moonlight",
};

const TMDB_API_KEY = process.env.TMDB_API_KEY;
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
  mediaType: 'movie' | 'tv';
  tmdbUrl: string;
}

async function getPopularContent(): Promise<CarouselItem[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY no está configurada');
    return [];
  }

  try {
    // Usamos trending/day para lo más "nuevo y caliente"
    const trendingRes = await fetch(
      `${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=es-ES`,
      { next: { revalidate: 1800 }, cache: 'force-cache' }
    );

    if (!trendingRes.ok) {
      console.error('Error fetching trending:', trendingRes.status);
      return [];
    }

    const trendingData = await trendingRes.json();

    if (!trendingData?.results?.length) return [];

    // Tomamos los 5 más populares del día
    const topItems = trendingData.results
      .sort((a: any, b: any) => b.popularity - a.popularity)
      .slice(0, 5);

    const detailedItems = await Promise.all(
      topItems.map(async (item: any) => {
        const mediaType = item.media_type || 'movie';
        const isMovie = mediaType === 'movie';
        
        try {
          const videosUrl = `${TMDB_BASE_URL}/${mediaType}/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`;
          const detailsUrl = `${TMDB_BASE_URL}/${mediaType}/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`;
          const imagesUrl = `${TMDB_BASE_URL}/${mediaType}/${item.id}/images?api_key=${TMDB_API_KEY}`;
          const ratingUrl = isMovie 
            ? `${TMDB_BASE_URL}/movie/${item.id}/release_dates?api_key=${TMDB_API_KEY}`
            : `${TMDB_BASE_URL}/tv/${item.id}/content_ratings?api_key=${TMDB_API_KEY}`;

          const [videosRes, detailsRes, imagesRes, ratingRes] = await Promise.all([
            fetch(videosUrl, { next: { revalidate: 86400 }, cache: 'force-cache' }),
            fetch(detailsUrl, { next: { revalidate: 3600 }, cache: 'force-cache' }),
            fetch(imagesUrl, { next: { revalidate: 86400 }, cache: 'force-cache' }),
            fetch(ratingUrl, { next: { revalidate: 86400 }, cache: 'force-cache' }),
          ]);

          const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
          const detailsData = detailsRes.ok ? await detailsRes.json() : {};
          const imagesData = imagesRes.ok ? await imagesRes.json() : { logos: [] };
          const ratingData = ratingRes.ok ? await ratingRes.json() : null;

          // Procesar logo
          const logos = imagesData.logos || [];
          const esLogo = logos.find((l: any) => l.iso_639_1 === 'es');
          const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
          const logoPath = esLogo?.file_path || enLogo?.file_path || logos[0]?.file_path || '';

          // Procesar clasificación
          let ageRating = '';
          if (ratingData) {
            if (isMovie) {
              const cert = ratingData.results?.find((r: any) => r.iso_3166_1 === 'ES')?.release_dates?.find((d: any) => d.certification)?.certification ||
                          ratingData.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates?.find((d: any) => d.certification)?.certification || '';
              ageRating = convertToAgeFormat(cert);
            } else {
              const rating = ratingData.results?.find((r: any) => r.iso_3166_1 === 'ES')?.rating ||
                            ratingData.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating || '';
              ageRating = convertToAgeFormat(rating);
            }
          }

          // Formatear según tipo
          let displayRuntime = '';
          if (isMovie) {
            const runtime = detailsData?.runtime || 0;
            if (runtime > 0) {
              const hours = Math.floor(runtime / 60);
              const mins = runtime % 60;
              displayRuntime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            }
          } else {
            const seasons = detailsData?.number_of_seasons || 0;
            if (seasons > 0) {
              displayRuntime = `${seasons} Temporada${seasons > 1 ? 's' : ''}`;
            }
          }

          return {
            id: item.id,
            displayTitle: isMovie ? (item.title || 'Sin título') : (item.name || 'Sin título'),
            displayYear: isMovie 
              ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
              : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
            displayRuntime,
            overview: item.overview || '',
            backdrop_path: item.backdrop_path || '',
            poster_path: item.poster_path || '',
            vote_average: item.vote_average || 0,
            ageRating,
            logo_path: logoPath,
            genres: detailsData?.genres?.slice(0, 5) || [],
            videos: videosData,
            mediaType: mediaType as 'movie' | 'tv',
            tmdbUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
          };
        } catch (error) {
          console.error(`Error fetching details for ${item.id}:`, error);
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
      })
    );

    return detailedItems;
  } catch (error) {
    console.error('Error en getPopularContent:', error);
    return [];
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

async function NewPopularContent() {
  const items = await getPopularContent();

  if (!items?.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No se pudo cargar el contenido popular</h1>
          <p className="text-gray-400">Verifica tu conexión y la API key de TMDB</p>
        </div>
      </div>
    );
  }

  return (
    <HeroCarousel 
      items={items}
      mediaType="movie"
      autoPlayInterval={8000} 
      trailerDelay={5000} 
    />
  );
}

export default function NewPopularPage() {
  return (
    <main className="min-h-screen bg-black">
      <Suspense fallback={<MediaLoader type="movies" />}>
        <NewPopularContent />
      </Suspense>
    </main>
  );
}