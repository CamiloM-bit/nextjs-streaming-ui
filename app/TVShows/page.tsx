import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Series | Moonlight",
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
  mediaType: 'tv';
  tmdbUrl: string;
}

async function getTrendingSeries(): Promise<CarouselItem[]> {
  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY no está configurada');
      return [];
    }

    const trendingRes = await fetch(
      `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=es-ES`,
      { next: { revalidate: 3600 }, cache: 'force-cache' }
    );

    if (!trendingRes.ok) {
      console.error('Error fetching trending:', trendingRes.status);
      return [];
    }

    const trendingData = await trendingRes.json();

    if (!trendingData.results || trendingData.results.length === 0) {
      return [];
    }

    const seriesWithDetails = await Promise.all(
      trendingData.results.slice(0, 5).map(async (item: any) => {
        try {
          const [videosRes, detailsRes, imagesRes] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/tv/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`,
              { next: { revalidate: 86400 }, cache: 'force-cache' }),
            fetch(`${TMDB_BASE_URL}/tv/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`,
              { next: { revalidate: 3600 }, cache: 'force-cache' }),
            fetch(`${TMDB_BASE_URL}/tv/${item.id}/images?api_key=${TMDB_API_KEY}`,
              { next: { revalidate: 86400 }, cache: 'force-cache' })
          ]);

          const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
          const detailsData = detailsRes.ok ? await detailsRes.json() : {};
          const imagesData = imagesRes.ok ? await imagesRes.json() : { logos: [] };

          const logos = imagesData.logos || [];
          const esLogo = logos.find((l: any) => l.iso_639_1 === 'es');
          const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
          const logoPath = esLogo?.file_path || enLogo?.file_path || logos[0]?.file_path || '';

          let ageRating = '';
          try {
            const contentRes = await fetch(`${TMDB_BASE_URL}/tv/${item.id}/content_ratings?api_key=${TMDB_API_KEY}`,
              { next: { revalidate: 86400 }, cache: 'force-cache' });
            if (contentRes.ok) {
              const data = await contentRes.json();
              const rating = data.results?.find((r: any) => r.iso_3166_1 === 'ES')?.rating ||
                data.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating || '';
              ageRating = convertToAgeFormat(rating);
            }
          } catch (e) { console.error(e); }

          // Formatear para el carousel
          const numberOfSeasons = detailsData.number_of_seasons || 0;
          
          return {
            id: item.id,
            displayTitle: item.name || 'Sin título',
            displayYear: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '',
            displayRuntime: numberOfSeasons > 0 
              ? `${numberOfSeasons} Temporada${numberOfSeasons > 1 ? 's' : ''}` 
              : '',
            overview: item.overview || '',
            backdrop_path: item.backdrop_path || '',
            poster_path: item.poster_path || '',
            vote_average: item.vote_average || 0,
            ageRating,
            logo_path: logoPath,
            genres: detailsData.genres?.slice(0, 5) || [],
            videos: videosData,
            mediaType: 'tv' as const,
            tmdbUrl: `https://www.themoviedb.org/tv/${item.id}`,
          };
        } catch (error) {
          console.error(`Error fetching details for ${item.id}:`, error);
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
      })
    );

    return seriesWithDetails;
  } catch (error) {
    console.error('Error en getTrendingSeries:', error);
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

async function SeriesContent() {
  const series = await getTrendingSeries();

  if (!series || series.length === 0) {
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
    <HeroCarousel
      items={series}
      mediaType="tv"
      autoPlayInterval={8000}
      trailerDelay={5000}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<MediaLoader type="series" />}>
      <SeriesContent />
    </Suspense>
  );
}