"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import "../globals.css";



export default function Navbar() {
  const pathname = usePathname()
  // 🚀 Para cambiar la URL manualmente
  const router = useRouter()

  // 🔥 Estado visual inmediato
  const [active, setActive] = useState(pathname)

  // 🔄 Cuando la ruta cambie realmente, sincronizamos
  useEffect(() => {
    setActive(pathname)
  }, [pathname])

  return (<>
    <header className="flex items-center border border-blue-800 h-16">
      <div className="border border-red-800 flex-1 h-full">
        <div className="border border-orange-600"> {/* Perfil Container */}
          <div className="">
            <figure></figure>
          </div>
        </div>
      </div>
      {<nav className="flex-1 border border-orange-400 w-1/2 h-full content-center">
        <Link href="/es"  onFocus={() => {
          setActive("/es")           // cambia visual inmediato
          router.replace("/es")      // cambia ruta real
        }}
        className={`outline-0 p-1.5 px-3 rounded-4xl transition
          ${active === "/es"
            ? "bg-neutral-500 text-white"
            : "hover:bg-neutral-500"}`}>
          Inicio
        </Link> {" "} {/* {""} ----> Genera Espacios */}
        <Link href="/Peliculas" onFocus={() => {
          setActive("/Peliculas")           // cambia visual inmediato
          router.replace("/Peliculas")      // cambia ruta real
        }}
          className={`outline-0 p-1.5 px-3 rounded-4xl transition
          ${active === "/Peliculas"
              ? "bg-neutral-500 text-white"
              : "hover:bg-neutral-500"}`}>Películas</Link> {" "}
        <Link href="/Series"  onFocus={() => {
          setActive("/Series")           // cambia visual inmediato
          router.replace("/Series")      // cambia ruta real
        }}
        className={`outline-0 p-1.5 px-3 rounded-4xl transition
          ${active === "/Series"
            ? "bg-neutral-500 text-white"
            : "hover:bg-neutral-500"}`}> Series</Link> {" "}
        <Link href="/MiLista" onFocus={() => {
          setActive("/MiLista")           // cambia visual inmediato
          router.replace("/MiLista")      // cambia ruta real
        }}
        className={`outline-0 p-1.5 px-3 rounded-4xl transition
          ${active === "/MiLista"
            ? "bg-neutral-500 text-white"
            : "hover:bg-neutral-500"}`}>Mi Lista</Link> {" "}
      </nav>}
      <div className="flex-1 border border-blue-700">

      </div>
    </header>
  </>

  );
}
