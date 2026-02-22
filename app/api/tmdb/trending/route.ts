import { NextResponse } from "next/server"

export async function GET() {
  const res = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_KEY}`
  )

  const data = await res.json()

  return NextResponse.json(data)
}