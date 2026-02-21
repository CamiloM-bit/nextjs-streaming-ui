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
    <header className="flex items-center border border-orange-800  fixed  h-[12%] w-full" >
      <div className="border border-red-800  flex-1 h-full">
        <div className="border border-orange-500 h-full w-[50%] content-center"> {/* Logo Container */}
          <div>
            <figure className="border border-red-500 m-2.5 flex justify-center">
              <img className="w-37.5 text-center"  src="https://tv.selectra.com/sites/tv.selectra.com/files/styles/article_hero/public/images/logos/netflix-logo.png?itok=fCUER-69" alt="Logo" />
            </figure>
          </div>
        </div>
      </div>
      {<nav className="border border-blue-400  h-full w-[60%] content-center pl-6">
        <Link href="/es" onFocus={() => { setActive("/es")           // cambia visual Rapido 
          router.replace("/es")       // Remplaza la ruta real 
        }}
          className={`outline-0 p-1.5 px-3 relative text-gray-300  transition
          ${active === "/es"
              ? " text-white"
              : "hover:text-white"}`}>
          Inicio
          
        </Link> {" "} {/* {""} ----> Generacion de espacios */}
         {" "}
        <Link href="/TVShows" onFocus={() => {
          setActive("/TVShows")  
          router.replace("/TVShows")    
        }}
          className={`outline-0 p-1.5 px-3 text-gray-300 transition
          ${active === "/TVShows"
              ? " text-white"
              : "hover:text-white"}`}> TV Shows</Link> {" "}
              <Link href="/Movies" onFocus={() => {
          setActive("/Movies")           
          router.replace("/Movies")      
        }}
          className={`outline-0 p-1.5 px-3  text-gray-300 transition
          ${active === "/Movies"
              ? " text-white"
              : "hover:text-white"}`}>Movies</Link>
          
          <Link href="/New&Popular" onFocus={() => {
          setActive("/New&Popular")           
          router.replace("/New&Popular")      
        }}
          className={`outline-0 p-1.5 px-3  text-gray-300 transition
          ${active === "/New&Popular"
              ? " text-white"
              : "hover:text-white"}`}>New & Popular</Link>
        <Link href="/MiLista" onFocus={() => {
          setActive("/MiLista")          
          router.replace("/MiLista")      
        }}
          className={`outline-0 p-1.5 px-3 text-gray-300 transition
          ${active === "/MiLista"
              ? " text-white"
              : "hover:text-white"}`}>My List</Link> {" "}


              <Link href="/Collections" onFocus={() => {
          setActive("/Collections")           
          router.replace("/Collections")      
        }}
          className={`outline-0 p-1.5 px-3  text-gray-300 transition
          ${active === "/Collections"
              ? " text-white"
              : "hover:text-white"}`}>Collections</Link>{" "}    
      </nav>}
      <div className="flex-1 border border-blue-700">

      </div>
    </header>
  </>

  );
}
