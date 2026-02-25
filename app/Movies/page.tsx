import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarouselMovies from "@/app/components/hero/HeroCarouselMovies";
import MediaLoader from "@/app/components/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Películas",
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

interface Genre {
  id: number;
  name: string;
}

interface Movie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  videos?: { results: Video[] };
  runtime?: number;
  ageRating?: string;
  logo_path?: string;
  genres?: Genre[];
}

async function getTrendingMovies(): Promise<Movie[]> {
  try {
    if (!TMDB_API_KEY) { 
      console.error('TMDB_API_KEY no está configurada');
      return [];
    }

    const trendingRes = await fetch(
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=es-ES`,
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

    const moviesWithDetails = await Promise.all(
      trendingData.results.slice(0, 5).map(async (item: any) => {
        try {
          const [videosRes, detailsRes, imagesRes] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/movie/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`, 
              { next: { revalidate: 86400 }, cache: 'force-cache' }),
            fetch(`${TMDB_BASE_URL}/movie/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`, 
              { next: { revalidate: 3600 }, cache: 'force-cache' }),
            fetch(`${TMDB_BASE_URL}/movie/${item.id}/images?api_key=${TMDB_API_KEY}`, 
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
            const releaseRes = await fetch(`${TMDB_BASE_URL}/movie/${item.id}/release_dates?api_key=${TMDB_API_KEY}`, 
              { next: { revalidate: 86400 }, cache: 'force-cache' });
            if (releaseRes.ok) {
              const data = await releaseRes.json();
              const cert = data.results?.find((r: any) => r.iso_3166_1 === 'ES')?.release_dates?.find((d: any) => d.certification)?.certification ||
                          data.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates?.find((d: any) => d.certification)?.certification || '';
              ageRating = convertToAgeFormat(cert);
            }
          } catch (e) { console.error(e); }

          return { 
            ...item, 
            videos: videosData, 
            ageRating, 
            logo_path: logoPath, 
            runtime: detailsData.runtime,
            genres: detailsData.genres?.slice(0, 5) || []
          };
        } catch (error) {
          console.error(`Error fetching details for ${item.id}:`, error);
          return { ...item, videos: { results: [] }, ageRating: '', logo_path: '' };
        }
      })
    );

    return moviesWithDetails;
  } catch (error) {
    console.error('Error en getTrendingMovies:', error);
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

async function MoviesContent() {
  const movies = await getTrendingMovies();
  
  if (!movies || movies.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No se pudieron cargar las películas</h1>
          <p className="text-gray-400">Verifica tu conexión y la API key de TMDB</p>
        </div>
      </div>
    );
  }

  return <HeroCarouselMovies movies={movies} autoPlayInterval={8000} trailerDelay={5000} />;
}

export default function Page() {
  return (
    <Suspense fallback={<MediaLoader type="movies" />}>
      <MoviesContent />
    </Suspense>
  );
}