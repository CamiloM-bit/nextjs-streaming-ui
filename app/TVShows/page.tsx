import type { Metadata } from "next";
import HeroCarouselSeries from "@/app/components/hero/HeroCarouselSeries";

export const metadata: Metadata = {
  title: "Series",
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

interface Series {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  first_air_date: string;
  videos?: { results: Video[] };
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  ageRating?: string;
  logo_path?: string;
  genres?: Genre[];
}

async function getTrendingSeries(): Promise<Series[]> {
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

          return { 
            ...item, 
            videos: videosData, 
            ageRating, 
            logo_path: logoPath,
            number_of_seasons: detailsData.number_of_seasons,
            number_of_episodes: detailsData.number_of_episodes,
            seasons: detailsData.seasons?.filter((s: Season) => s.season_number > 0) || [],
            genres: detailsData.genres?.slice(0, 5) || []
          };
        } catch (error) {
          console.error(`Error fetching details for ${item.id}:`, error);
          return { ...item, videos: { results: [] }, ageRating: '', logo_path: '' };
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

export default async function Page() {
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
     <div className="w-full h-auto">
          <HeroCarouselSeries series={series} autoPlayInterval={8000} trailerDelay={5000} />
     </div>
  );
}