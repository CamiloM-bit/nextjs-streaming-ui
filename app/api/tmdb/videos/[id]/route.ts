import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${params.id}/videos?api_key=${process.env.TMDB_KEY}`
  )

  const data = await res.json()

  return NextResponse.json(data)
}