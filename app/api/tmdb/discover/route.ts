import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sort_by') || 'popularity.desc';
  const withGenres = searchParams.get('with_genres');
  const page = searchParams.get('page') || '1';

  try {
    let url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&sort_by=${sortBy}&page=${page}`;
    
    if (withGenres) {
      url += `&with_genres=${withGenres}`;
    }

    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) throw new Error('Error fetching discover');

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Discover error:', error);
    return NextResponse.json(
      { error: 'Error al obtener películas' },
      { status: 500 }
    );
  }
}