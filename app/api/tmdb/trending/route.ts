import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeWindow = searchParams.get('time_window') || 'week';
  const mediaType = searchParams.get('media_type') || 'all';

  try {
    // Obtener trending
    const trendingRes = await fetch(
      `${BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}&language=es-ES`,
      { next: { revalidate: 3600 } }
    );

    if (!trendingRes.ok) throw new Error('Error fetching trending');

    const trendingData = await trendingRes.json();

    // Obtener videos para cada película/serie (solo los primeros 5 para el hero)
    const moviesWithVideos = await Promise.all(
      trendingData.results.slice(0, 5).map(async (item: any) => {
        const endpoint = item.media_type === 'tv' ? 'tv' : 'movie';
        const videosRes = await fetch(
          `${BASE_URL}/${endpoint}/${item.id}/videos?api_key=${TMDB_API_KEY}&language=es-ES&include_video_language=en,es`,
          { next: { revalidate: 86400 } }
        );
        
        const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
        
        return {
          ...item,
          videos: videosData,
        };
      })
    );

    return NextResponse.json({ results: moviesWithVideos });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de TMDB' },
      { status: 500 }
    );
  }
}