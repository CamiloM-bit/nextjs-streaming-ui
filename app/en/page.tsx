import type { Metadata } from "next";
import HeroCarousel from "@/app/components/hero/HeroCarousel";

// Configuración de TMDB
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

interface Movie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  videos?: {
    results: Video[];
  };
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  runtime?: number;
  ageRating?: string; // Formato +7, +12, +16, +18
}

async function getTrendingMovies(): Promise<Movie[]> {
  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY no está configurada');
      return [];
    }

    const trendingRes = await fetch(
      `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}&language=es-ES`,
      { 
        next: { revalidate: 3600 },
        cache: 'force-cache'
      }
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
        const isTV = item.media_type === 'tv';
        const endpoint = isTV ? 'tv' : 'movie';
        
        try {
          const videosRes = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`,
            { 
              next: { revalidate: 86400 },
              cache: 'force-cache'
            }
          );
          
          const videosData = videosRes.ok ? await videosRes.json() : { results: [] };

          const detailsRes = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`,
            { 
              next: { revalidate: 3600 },
              cache: 'force-cache'
            }
          );
          
          let extraDetails: any = {};
          let ageRating = '';
          
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            
            if (isTV) {
              extraDetails = {
                number_of_seasons: detailsData.number_of_seasons,
                number_of_episodes: detailsData.number_of_episodes,
                seasons: detailsData.seasons?.filter((s: Season) => s.season_number > 0) || [],
              };
            } else {
              extraDetails = {
                runtime: detailsData.runtime,
              };
            }
          }

          // Obtener clasificación de edad
          try {
            if (isTV) {
              const contentRatingsRes = await fetch(
                `${TMDB_BASE_URL}/tv/${item.id}/content_ratings?api_key=${TMDB_API_KEY}`,
                { next: { revalidate: 86400 }, cache: 'force-cache' }
              );
              
              if (contentRatingsRes.ok) {
                const contentData = await contentRatingsRes.json();
                const esRating = contentData.results?.find((r: any) => r.iso_3166_1 === 'ES');
                const usRating = contentData.results?.find((r: any) => r.iso_3166_1 === 'US');
                const rating = esRating?.rating || usRating?.rating || '';
                ageRating = convertToAgeFormat(rating);
              }
            } else {
              const releaseDatesRes = await fetch(
                `${TMDB_BASE_URL}/movie/${item.id}/release_dates?api_key=${TMDB_API_KEY}`,
                { next: { revalidate: 86400 }, cache: 'force-cache' }
              );
              
              if (releaseDatesRes.ok) {
                const releaseData = await releaseDatesRes.json();
                const esRelease = releaseData.results?.find((r: any) => r.iso_3166_1 === 'ES');
                const usRelease = releaseData.results?.find((r: any) => r.iso_3166_1 === 'US');
                
                const certificationES = esRelease?.release_dates?.find((d: any) => d.certification)?.certification;
                const certificationUS = usRelease?.release_dates?.find((d: any) => d.certification)?.certification;
                
                const certification = certificationES || certificationUS || '';
                ageRating = convertToAgeFormat(certification);
              }
            }
          } catch (certError) {
            console.error(`Error fetching certification for ${item.id}:`, certError);
          }

          return {
            ...item,
            videos: videosData,
            ageRating,
            ...extraDetails,
          };
        } catch (error) {
          console.error(`Error fetching details for ${item.id}:`, error);
          return { 
            ...item, 
            videos: { results: [] },
            ageRating: '',
          };
        }
      })
    );

    return moviesWithDetails;

  } catch (error) {
    console.error('Error en getTrendingMovies:', error);
    return [];
  }
}

// Función para convertir certificaciones a formato +edad
function convertToAgeFormat(cert: string): string {
  if (!cert) return '';
  
  // Mapeo de certificaciones a edades
  const ageMap: { [key: string]: string } = {
    // Sistema español (ICAA)
    'APTA': '+0',
    '7': '+7',
    '12': '+12',
    '16': '+16',
    '18': '+18',
    // Sistema USA (MPAA)
    'G': '+0',
    'PG': '+7',
    'PG-13': '+12',
    'R': '+16',
    'NC-17': '+18',
    // Sistema TV (USA)
    'TV-Y': '+0',
    'TV-Y7': '+7',
    'TV-G': '+0',
    'TV-PG': '+7',
    'TV-14': '+14',
    'TV-MA': '+18',
  };
  
  return ageMap[cert] || '';
}

export default async function Page() {
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

  return (
    <main className="w-full">
      <div 
        className="relative w-full overflow-hidden bg-black"
        style={{ 
          height: '30vh',
          minHeight: '600px'
        }}
      >
        <HeroCarousel 
          movies={movies} 
          autoPlayInterval={8000}
          trailerDelay={5000}
        />
      </div>
    </main>
  );
}