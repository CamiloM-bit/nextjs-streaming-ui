import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
      { next: { revalidate: 0 } }
    );

    if (!response.ok) throw new Error('Error fetching search results');

    const data = await response.json();

    const resultsWithVideos = await Promise.all(
      data.results.slice(0, 5).map(async (item: any) => {
        if (item.media_type === 'person') return item;

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

    return NextResponse.json({
      ...data,
      results: resultsWithVideos
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Error al buscar en TMDB' },
      { status: 500 }
    );
  }
}