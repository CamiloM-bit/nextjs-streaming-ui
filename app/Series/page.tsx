import type { Metadata } from "next";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow";
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
  mediaType: 'tv';
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
  mediaType: 'tv';
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

// NOTA: Función expandida para obtener muchas categorías de series
async function getSeriesData() {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY no está configurada');
    return {
      trendingData: { results: [] },
      popularData: { results: [] },
      topRatedData: { results: [] },
      onTheAirData: { results: [] },
      airingTodayData: { results: [] },
      actionAdventureData: { results: [] },
      animationData: { results: [] },
      comedyData: { results: [] },
      crimeData: { results: [] },
      documentaryData: { results: [] },
      dramaData: { results: [] },
      familyData: { results: [] },
      mysteryData: { results: [] },
      scifiFantasyData: { results: [] },
      warPoliticsData: { results: [] },
      westernData: { results: [] },
    };
  }

  // NOTA: 16 endpoints de series en paralelo
  const results = await Promise.all([
    safeFetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=es-ES`, 1800),
    safeFetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    safeFetch(`${TMDB_BASE_URL}/tv/airing_today?api_key=${TMDB_API_KEY}&language=es-ES&page=1`),
    // Géneros específicos
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10759&sort_by=popularity.desc&page=1`), // Acción y Aventura
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=16&sort_by=popularity.desc&page=1`), // Animación
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=35&sort_by=popularity.desc&page=1`), // Comedia
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=80&sort_by=popularity.desc&page=1`), // Crimen
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=99&sort_by=popularity.desc&page=1`), // Documental
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=18&sort_by=popularity.desc&page=1`), // Drama
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10751&sort_by=popularity.desc&page=1`), // Familiar
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=9648&sort_by=popularity.desc&page=1`), // Misterio
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10765&sort_by=popularity.desc&page=1`), // Ciencia Ficción y Fantasía
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=10768&sort_by=popularity.desc&page=1`), // Guerra y Política
    safeFetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-ES&with_genres=37&sort_by=popularity.desc&page=1`), // Western
  ]);

  return {
    trendingData: results[0],
    popularData: results[1],
    topRatedData: results[2],
    onTheAirData: results[3],
    airingTodayData: results[4],
    actionAdventureData: results[5],
    animationData: results[6],
    comedyData: results[7],
    crimeData: results[8],
    documentaryData: results[9],
    dramaData: results[10],
    familyData: results[11],
    mysteryData: results[12],
    scifiFantasyData: results[13],
    warPoliticsData: results[14],
    westernData: results[15],
  };
}

// NOTA: Enriquece items del Hero con logos y detalles completos
async function enrichHeroItem(item: any): Promise<CarouselItem> {
  try {
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

    const logos = imagesData.logos || [];
    const esLogo = logos.find((l: any) => l.iso_639_1 === 'es');
    const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
    const logoPath = esLogo?.file_path || enLogo?.file_path || logos[0]?.file_path || '';

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
      tmdbUrl: `https://www.themoviedb.org/tv/${item.id}`,
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

function toPosterItem(item: any): PosterItem {
  return {
    id: item.id,
    title: item.name || 'Sin título',
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    vote_average: item.vote_average || 0,
    releaseYear: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '',
    duration: '',
    ageRating: '13+',
    overview: item.overview || '',
    genres: item.genre_ids?.map((id: number) => ({ id, name: '' })) || [],
    mediaType: 'tv' as const,
  };
}

async function SeriesContent() {
  const {
    trendingData,
    popularData,
    topRatedData,
    onTheAirData,
    airingTodayData,
    actionAdventureData,
    animationData,
    comedyData,
    crimeData,
    documentaryData,
    dramaData,
    familyData,
    mysteryData,
    scifiFantasyData,
    warPoliticsData,
    westernData,
  } = await getSeriesData();

  // NOTA: Enriquecimiento paralelo del Hero
  const heroItems = await Promise.all(
    (trendingData?.results?.slice(0, 5) || []).map(enrichHeroItem)
  );

  // Mapeo de todas las categorías
  const popularSeries = popularData?.results?.slice(0, 15).map(toPosterItem) || [];
  const topRatedSeries = topRatedData?.results?.slice(0, 15).map(toPosterItem) || [];
  const onTheAirSeries = onTheAirData?.results?.slice(0, 15).map(toPosterItem) || [];
  const airingTodaySeries = airingTodayData?.results?.slice(0, 15).map(toPosterItem) || [];
  const actionAdventure = actionAdventureData?.results?.slice(0, 15).map(toPosterItem) || [];
  const animation = animationData?.results?.slice(0, 15).map(toPosterItem) || [];
  const comedy = comedyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const crime = crimeData?.results?.slice(0, 15).map(toPosterItem) || [];
  const documentary = documentaryData?.results?.slice(0, 15).map(toPosterItem) || [];
  const drama = dramaData?.results?.slice(0, 15).map(toPosterItem) || [];
  const family = familyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const mystery = mysteryData?.results?.slice(0, 15).map(toPosterItem) || [];
  const scifiFantasy = scifiFantasyData?.results?.slice(0, 15).map(toPosterItem) || [];
  const warPolitics = warPoliticsData?.results?.slice(0, 15).map(toPosterItem) || [];
  const western = westernData?.results?.slice(0, 15).map(toPosterItem) || [];

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
      <HeroCarousel
        items={heroItems}
        mediaType="tv"
        autoPlayInterval={8000}
        trailerDelay={5000}
      />
      
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        {/* Tendencias y Populares */}
        <PosterRow title="🔥 Series en Tendencia" items={popularSeries} mediaType="tv" />
        <PosterRow title="⭐ Series Populares" items={popularSeries} mediaType="tv" />
        <PosterRow title="🏆 Mejor Valoradas" items={topRatedSeries} mediaType="tv" />
        
        {/* En Emisión */}
        <PosterRow title="📡 En Emisión" items={onTheAirSeries} mediaType="tv" />
        <PosterRow title="📺 Emitiéndose Hoy" items={airingTodaySeries} mediaType="tv" />
        
        {/* Por Géneros */}
        <PosterRow title="⚔️ Acción y Aventura" items={actionAdventure} mediaType="tv" />
        <PosterRow title="🎨 Animación" items={animation} mediaType="tv" />
        <PosterRow title="😂 Comedia" items={comedy} mediaType="tv" />
        <PosterRow title="🕵️ Crimen" items={crime} mediaType="tv" />
        <PosterRow title="📽️ Documentales" items={documentary} mediaType="tv" />
        <PosterRow title="🎭 Drama" items={drama} mediaType="tv" />
        <PosterRow title="👨‍👩‍👧‍👦 Familiar" items={family} mediaType="tv" />
        <PosterRow title="🔮 Misterio" items={mystery} mediaType="tv" />
        <PosterRow title="🚀 Ciencia Ficción y Fantasía" items={scifiFantasy} mediaType="tv" />
        <PosterRow title="⚔️🗳️ Guerra y Política" items={warPolitics} mediaType="tv" />
        <PosterRow title="🤠 Western" items={western} mediaType="tv" />
      </div>
    </div>
  );
}

export default function Page() {
  return <SeriesContent />;
}