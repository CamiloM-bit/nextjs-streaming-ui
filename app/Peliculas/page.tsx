import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow";
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Películas | Moonlight",
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
  mediaType: 'movie';
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
  mediaType: 'movie';
}

// NOTA: Helper para fetch seguro
async function safeFetch(url: string, revalidate: number = 3600): Promise<any> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) {
      console.error(`Fetch error ${res.status}: ${url}`);
      return { results: [] };
    }
    const text = await res.text();
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

function formatRuntime(minutes: number): string {
  if (!minutes || minutes === 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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

// NOTA: Función expandida para obtener muchas categorías de películas
async function getMoviesData() {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY no está configurada');
    return {
      trendingData: { results: [] },
      popularData: { results: [] },
      topRatedData: { results: [] },
      nowPlayingData: { results: [] },
      upcomingData: { results: [] },
      actionData: { results: [] },
      adventureData: { results: [] },
      animationData: { results: [] },
      comedyData: { results: [] },
      crimeData: { results: [] },
      documentaryData: { results: [] },
      dramaData: { results: [] },
      familyData: { results: [] },
      fantasyData: { results: [] },
      historyData: { results: [] },
      horrorData: { results: [] },
      musicData: { results: [] },
      mysteryData: { results: [] },
      romanceData: { results: [] },
      scifiData: { results: [] },
      thrillerData: { results: [] },
      warData: { results: [] },
      westernData: { results: [] },
    };
  }

  // NOTA: 22 endpoints de películas en paralelo
  const results = await Promise.all([
    safeFetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=es-ES`, 1800),
    safeFetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=es-ES&region=ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=es-ES&region=ES&page=1`),
    // Géneros específicos
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=28&sort_by=popularity.desc&page=1`), // Acción
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=12&sort_by=popularity.desc&page=1`), // Aventura
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=16&sort_by=popularity.desc&page=1`), // Animación
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=35&sort_by=popularity.desc&page=1`), // Comedia
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=80&sort_by=popularity.desc&page=1`), // Crimen
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=99&sort_by=popularity.desc&page=1`), // Documental
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=18&sort_by=popularity.desc&page=1`), // Drama
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10751&sort_by=popularity.desc&page=1`), // Familiar
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=14&sort_by=popularity.desc&page=1`), // Fantasía
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=36&sort_by=popularity.desc&page=1`), // Historia
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=27&sort_by=popularity.desc&page=1`), // Terror
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10402&sort_by=popularity.desc&page=1`), // Música
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=9648&sort_by=popularity.desc&page=1`), // Misterio
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10749&sort_by=popularity.desc&page=1`), // Romance
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=878&sort_by=popularity.desc&page=1`), // Ciencia Ficción
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=53&sort_by=popularity.desc&page=1`), // Suspense
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10752&sort_by=popularity.desc&page=1`), // Guerra
    safeFetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=37&sort_by=popularity.desc&page=1`), // Western
  ]);

  return {
    trendingData: results[0],
    popularData: results[1],
    topRatedData: results[2],
    nowPlayingData: results[3],
    upcomingData: results[4],
    actionData: results[5],
    adventureData: results[6],
    animationData: results[7],
    comedyData: results[8],
    crimeData: results[9],
    documentaryData: results[10],
    dramaData: results[11],
    familyData: results[12],
    fantasyData: results[13],
    historyData: results[14],
    horrorData: results[15],
    musicData: results[16],
    mysteryData: results[17],
    romanceData: results[18],
    scifiData: results[19],
    thrillerData: results[20],
    warData: results[21],
    westernData: results[22],
  };
}

// NOTA: Enriquece items del Hero con logos y detalles completos
async function enrichHeroItem(item: any): Promise<CarouselItem> {
  try {
    const [videosRes, detailsRes, imagesRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`,
        { next: { revalidate: 86400 } }),
      fetch(`${TMDB_BASE_URL}/movie/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`,
        { next: { revalidate: 3600 } }),
      fetch(`${TMDB_BASE_URL}/movie/${item.id}/images?api_key=${TMDB_API_KEY}`,
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
      const releaseRes = await fetch(`${TMDB_BASE_URL}/movie/${item.id}/release_dates?api_key=${TMDB_API_KEY}`,
        { next: { revalidate: 86400 } });
      if (releaseRes.ok) {
        const data = await releaseRes.json();
        const cert = data.results?.find((r: any) => r.iso_3166_1 === 'ES')?.release_dates?.find((d: any) => d.certification)?.certification ||
                    data.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates?.find((d: any) => d.certification)?.certification || '';
        ageRating = convertToAgeFormat(cert);
      }
    } catch (e) { console.error(e); }

    return {
      id: item.id,
      displayTitle: item.title || 'Sin título',
      displayYear: item.release_date ? new Date(item.release_date).getFullYear().toString() : '',
      displayRuntime: formatRuntime(detailsData.runtime),
      overview: item.overview || '',
      backdrop_path: item.backdrop_path || '',
      poster_path: item.poster_path || '',
      vote_average: item.vote_average || 0,
      ageRating,
      logo_path: logoPath,
      genres: detailsData.genres?.slice(0, 5) || [],
      videos: videosData,
      mediaType: 'movie' as const,
      tmdbUrl: `https://www.themoviedb.org/movie/${item.id}`,
    };
  } catch (error) {
    console.error(`Error enriqueciendo película ${item.id}:`, error);
    return {
      id: item.id,
      displayTitle: item.title || 'Sin título',
      displayYear: item.release_date ? new Date(item.release_date).getFullYear().toString() : '',
      displayRuntime: '',
      overview: item.overview || '',
      backdrop_path: item.backdrop_path || '',
      poster_path: item.poster_path || '',
      vote_average: item.vote_average || 0,
      ageRating: '',
      logo_path: '',
      genres: [],
      videos: { results: [] },
      mediaType: 'movie' as const,
      tmdbUrl: `https://www.themoviedb.org/movie/${item.id}`,
    };
  }
}

function toPosterItem(item: any): PosterItem {
  return {
    id: item.id,
    title: item.title || 'Sin título',
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    vote_average: item.vote_average || 0,
    releaseYear: item.release_date ? new Date(item.release_date).getFullYear().toString() : '',
    duration: '',
    ageRating: '13+',
    overview: item.overview || '',
    genres: item.genre_ids?.map((id: number) => ({ id, name: '' })) || [],
    mediaType: 'movie' as const,
  };
}

async function MoviesContent() {
  const {
    trendingData,
    popularData,
    topRatedData,
    nowPlayingData,
    upcomingData,
    actionData,
    adventureData,
    animationData,
    comedyData,
    crimeData,
    documentaryData,
    dramaData,
    familyData,
    fantasyData,
    historyData,
    horrorData,
    musicData,
    mysteryData,
    romanceData,
    scifiData,
    thrillerData,
    warData,
    westernData,
  } = await getMoviesData();

  // NOTA: Enriquecimiento paralelo del Hero
  const heroItems = await Promise.all(
    (trendingData?.results?.slice(0, 5) || []).map(enrichHeroItem)
  );

  // Mapeo de todas las categorías
  const popularMovies = popularData?.results?.slice(0, 15).map(toPosterItem) || [];
  const topRatedMovies = topRatedData?.results?.slice(0, 15).map(toPosterItem) || [];
  const nowPlayingMovies = nowPlayingData?.results?.slice(0, 15).map(toPosterItem) || [];
  const upcomingMovies = upcomingData?.results?.slice(0, 15).map(toPosterItem) || [];
  const actionMovies = actionData?.results?.slice(0, 15).map(toPosterItem) || [];
  const adventureMovies = adventureData?.results?.slice(0, 15).map(toPosterItem) || [];
  const animationMovies = animationData?.results?.slice(0, 15).map(toPosterItem) || [];
  const comedyMovies = comedyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const crimeMovies = crimeData?.results?.slice(0, 15).map(toPosterItem) || [];
  const documentaryMovies = documentaryData?.results?.slice(0, 15).map(toPosterItem) || [];
  const dramaMovies = dramaData?.results?.slice(0, 15).map(toPosterItem) || [];
  const familyMovies = familyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const fantasyMovies = fantasyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const historyMovies = historyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const horrorMovies = horrorData?.results?.slice(0, 15).map(toPosterItem) || [];
  const musicMovies = musicData?.results?.slice(0, 15).map(toPosterItem) || [];
  const mysteryMovies = mysteryData?.results?.slice(0, 15).map(toPosterItem) || [];
  const romanceMovies = romanceData?.results?.slice(0, 15).map(toPosterItem) || [];
  const scifiMovies = scifiData?.results?.slice(0, 15).map(toPosterItem) || [];
  const thrillerMovies = thrillerData?.results?.slice(0, 15).map(toPosterItem) || [];
  const warMovies = warData?.results?.slice(0, 15).map(toPosterItem) || [];
  const westernMovies = westernData?.results?.slice(0, 15).map(toPosterItem) || [];

  if (!heroItems || heroItems.length === 0) {
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
    <div className="min-h-screen bg-black">
      <HeroCarousel
        items={heroItems}
        mediaType="movie"
        autoPlayInterval={8000}
        trailerDelay={5000}
      />
      
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        {/* Tendencias y Populares */}
        <PosterRow title="🔥 Películas en Tendencia" items={popularMovies} mediaType="movie" />
        <PosterRow title="⭐ Populares" items={popularMovies} mediaType="movie" />
        <PosterRow title="🏆 Mejor Valoradas" items={topRatedMovies} mediaType="movie" />
        
        {/* Estrenos */}
        <PosterRow title="🎬 En Cartelera" items={nowPlayingMovies} mediaType="movie" />
        <PosterRow title="🚀 Próximos Estrenos" items={upcomingMovies} mediaType="movie" />
        
        {/* Por Géneros */}
        <PosterRow title="💥 Acción" items={actionMovies} mediaType="movie" />
        <PosterRow title="🗺️ Aventura" items={adventureMovies} mediaType="movie" />
        <PosterRow title="🎨 Animación" items={animationMovies} mediaType="movie" />
        <PosterRow title="😂 Comedia" items={comedyMovies} mediaType="movie" />
        <PosterRow title="🕵️ Crimen" items={crimeMovies} mediaType="movie" />
        <PosterRow title="📽️ Documentales" items={documentaryMovies} mediaType="movie" />
        <PosterRow title="🎭 Drama" items={dramaMovies} mediaType="movie" />
        <PosterRow title="👨‍👩‍👧‍👦 Familiar" items={familyMovies} mediaType="movie" />
        <PosterRow title="🧙‍♂️ Fantasía" items={fantasyMovies} mediaType="movie" />
        <PosterRow title="📜 Historia" items={historyMovies} mediaType="movie" />
        <PosterRow title="👻 Terror" items={horrorMovies} mediaType="movie" />
        <PosterRow title="🎵 Música" items={musicMovies} mediaType="movie" />
        <PosterRow title="🔮 Misterio" items={mysteryMovies} mediaType="movie" />
        <PosterRow title="❤️ Romance" items={romanceMovies} mediaType="movie" />
        <PosterRow title="🤖 Ciencia Ficción" items={scifiMovies} mediaType="movie" />
        <PosterRow title="😰 Suspense" items={thrillerMovies} mediaType="movie" />
        <PosterRow title="⚔️ Guerra" items={warMovies} mediaType="movie" />
        <PosterRow title="🤠 Western" items={westernMovies} mediaType="movie" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<MediaLoader type="movies" />}>
      <MoviesContent />
    </Suspense>
  );
}