import type { Metadata } from "next";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow";
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Home | Moonlight",
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
  mediaType: 'movie' | 'tv';
}

// NOTA: Helper para hacer fetch seguro con manejo de errores
async function safeFetch(url: string, revalidate: number = 3600): Promise<any> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    
    if (!res.ok) {
      console.error(`Fetch error ${res.status}: ${url}`);
      return { results: [] };
    }
    
    const text = await res.text();
    
    // Verificar si la respuesta está vacía
    if (!text || text.trim() === '') {
      console.error(`Empty response from: ${url}`);
      return { results: [] };
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error(`JSON parse error for ${url}:`, text.substring(0, 100));
      return { results: [] };
    }
  } catch (error) {
    console.error(`Network error for ${url}:`, error);
    return { results: [] };
  }
}

async function getHomeData() {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY no está configurada');
    return {
      trendingData: { results: [] },
      popularMoviesData: { results: [] },
      popularTVData: { results: [] },
      topRatedMoviesData: { results: [] },
      topRatedTVData: { results: [] },
      upcomingMoviesData: { results: [] },
      nowPlayingMoviesData: { results: [] },
      airingTodayTVData: { results: [] },
      onTheAirTVData: { results: [] },
      actionMoviesData: { results: [] },
      comedyMoviesData: { results: [] },
      horrorMoviesData: { results: [] },
      animationMoviesData: { results: [] },
      documentaryMoviesData: { results: [] },
      dramaTVData: { results: [] },
      actionAdventureTVData: { results: [] },
      animationTVData: { results: [] },
    };
  }

  // NOTA: Usar safeFetch para manejar errores de forma individual
  const results = await Promise.all([
    safeFetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}&language=es-ES`),
    safeFetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=es-ES&region=ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=es-ES&region=ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/airing_today?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=28&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=35&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=27&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=16&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=99&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=18&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10759&sort_by=popularity.desc&page=1`),
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=16&sort_by=popularity.desc&page=1`),
  ]);

  return {
    trendingData: results[0],
    popularMoviesData: results[1],
    popularTVData: results[2],
    topRatedMoviesData: results[3],
    topRatedTVData: results[4],
    upcomingMoviesData: results[5],
    nowPlayingMoviesData: results[6],
    airingTodayTVData: results[7],
    onTheAirTVData: results[8],
    actionMoviesData: results[9],
    comedyMoviesData: results[10],
    horrorMoviesData: results[11],
    animationMoviesData: results[12],
    documentaryMoviesData: results[13],
    dramaTVData: results[14],
    actionAdventureTVData: results[15],
    animationTVData: results[16],
  };
}

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

async function enrichHeroItem(item: any): Promise<CarouselItem> {
  const mediaType = item.media_type || 'movie';
  const isMovie = mediaType === 'movie';
  
  try {
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

    const logos = imagesData.logos || [];
    const esLogo = logos.find((l: any) => l.iso_639_1 === 'es');
    const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
    const logoPath = esLogo?.file_path || enLogo?.file_path || logos[0]?.file_path || '';

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
      tmdbUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
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
    duration: '',
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
    nowPlayingMoviesData,
    airingTodayTVData,
    onTheAirTVData,
    actionMoviesData,
    comedyMoviesData,
    horrorMoviesData,
    animationMoviesData,
    documentaryMoviesData,
    dramaTVData,
    actionAdventureTVData,
    animationTVData,
  } = await getHomeData();

  const heroItems = await Promise.all(
    (trendingData?.results?.slice(0, 5) || []).map(enrichHeroItem)
  );

  const popularMovies = popularMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const popularTV = popularTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const topRatedMovies = topRatedMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const topRatedTV = topRatedTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const upcomingMovies = upcomingMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  
  const nowPlayingMovies = nowPlayingMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const airingTodayTV = airingTodayTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const onTheAirTV = onTheAirTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const actionMovies = actionMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const comedyMovies = comedyMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const horrorMovies = horrorMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const animationMovies = animationMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const documentaries = documentaryMoviesData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'movie')) || [];
  const dramaTV = dramaTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const actionAdventureTV = actionAdventureTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];
  const animationTV = animationTVData?.results?.slice(0, 15).map((i: any) => toPosterItem(i, 'tv')) || [];

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
      <HeroCarousel
        items={heroItems}
        mediaType="movie"
        autoPlayInterval={8000}
        trailerDelay={5000}
      />
      
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        <PosterRow title="Películas Populares" items={popularMovies} mediaType="movie" />
        <PosterRow title="Series Populares" items={popularTV} mediaType="tv" />
        <PosterRow title="Películas Mejor Valoradas" items={topRatedMovies} mediaType="movie" />
        <PosterRow title="Series Mejor Valoradas" items={topRatedTV} mediaType="tv" />
        <PosterRow title="Próximos Estrenos" items={upcomingMovies} mediaType="movie" />
        
        <PosterRow title="En Cartelera Ahora" items={nowPlayingMovies} mediaType="movie" />
        <PosterRow title="Acción" items={actionMovies} mediaType="movie" />
        <PosterRow title="Comedia" items={comedyMovies} mediaType="movie" />
        <PosterRow title="Terror" items={horrorMovies} mediaType="movie" />
        <PosterRow title="Animación" items={animationMovies} mediaType="movie" />
        <PosterRow title="Documentales" items={documentaries} mediaType="movie" />
        
        <PosterRow title="Series al Aire Hoy" items={airingTodayTV} mediaType="tv" />
        <PosterRow title="Series en Emisión" items={onTheAirTV} mediaType="tv" />
        <PosterRow title="Series de Drama" items={dramaTV} mediaType="tv" />
        <PosterRow title="Acción y Aventura" items={actionAdventureTV} mediaType="tv" />
        <PosterRow title="Series de Animación" items={animationTV} mediaType="tv" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-black">
      <HomeContent />
    </main>
  );
}