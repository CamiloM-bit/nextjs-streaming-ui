import type { Metadata } from "next";
import { Suspense } from "react";
import HeroCarousel from "@/app/components/hero/HeroCarousel";
import PosterRow from "@/app/components/rows/PosterRow";
import MediaLoader from "@/app/components/ui/loaders/MediaLoader";

export const metadata: Metadata = {
  title: "Nuevas y Populares | Moonlight",
};

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface HeroItem {
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
  genres?: { id: number; name: string }[];
  videos?: { results: any[] };
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
  genres?: { id: number; name: string }[];
  mediaType: 'movie' | 'tv';
}

async function getNewPopularData() {
  if (!TMDB_API_KEY) return { hero: [], newMovies: [], newTV: [], comingSoon: [] };

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const [heroRes, newMoviesRes, newTVRes, upcomingRes] = await Promise.all([
    fetch(`${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=es-ES`, { next: { revalidate: 1800 } }),
    fetch(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=es-ES&region=ES`, { next: { revalidate: 3600 } }),
    fetch(`${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=es-ES`, { next: { revalidate: 3600 } }),
    fetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=es-ES&region=ES`, { next: { revalidate: 3600 } }),
  ]);

  const [heroData, newMoviesData, newTVData, upcomingData] = await Promise.all([
    heroRes.json(),
    newMoviesRes.json(),
    newTVRes.json(),
    upcomingRes.json(),
  ]);

  return { heroData, newMoviesData, newTVData, upcomingData };
}

function formatRuntime(item: any, isMovie: boolean): string {
  if (isMovie) {
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

function toHeroItem(item: any): HeroItem {
  const isMovie = item.media_type === 'movie';
  
  return {
    id: item.id,
    displayTitle: isMovie ? item.title : item.name,
    displayYear: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
    displayRuntime: formatRuntime(item, isMovie),
    overview: item.overview,
    backdrop_path: item.backdrop_path,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    ageRating: '13+',
    logo_path: item.logo_path,
    genres: item.genres,
    videos: item.videos,
    mediaType: isMovie ? 'movie' : 'tv',
    tmdbUrl: `https://www.themoviedb.org/${item.media_type}/${item.id}`,
  };
}

function toPosterItem(item: any, isMovie: boolean): PosterItem {
  const runtime = formatRuntime(item, isMovie);
  
  return {
    id: item.id,
    title: isMovie ? item.title : item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average,
    releaseYear: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear().toString() : '')
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : ''),
    duration: runtime,
    ageRating: '13+',
    overview: item.overview,
    genres: item.genres,
    mediaType: isMovie ? 'movie' : 'tv',
  };
}

async function NewPopularContent() {
  const { heroData, newMoviesData, newTVData, upcomingData } = await getNewPopularData();

  const heroItems = heroData?.results?.slice(0, 5).map(toHeroItem) || [];
  const newMovies = newMoviesData?.results?.slice(0, 10).map((i: any) => toPosterItem(i, true)) || [];
  const newTV = newTVData?.results?.slice(0, 10).map((i: any) => toPosterItem(i, false)) || [];
  const comingSoon = upcomingData?.results?.slice(0, 10).map((i: any) => toPosterItem(i, true)) || [];

  return (
    <div className="min-h-screen bg-black">
      <HeroCarousel items={heroItems} />
      
      <div className="relative z-20 -mt-20 space-y-8 pb-12">
        <PosterRow title="Nuevos Lanzamientos" items={newMovies} />
        <PosterRow title="Nuevas Series" items={newTV} />
        <PosterRow title="Próximamente" items={comingSoon} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<MediaLoader type="movies" />}>
      <NewPopularContent />
    </Suspense>
  );
}