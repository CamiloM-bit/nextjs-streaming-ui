"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Notificacion from '@/app/components/Notification'
import Search from '@/app/components/Search'
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
    <header className="flex items-center  border-orange-800  fixed pl-7  h-[12%] w-full" >
      <div className=" border-red-800  flex-1 h-full">
        <div className=" border-orange-500 h-full w-[50%] content-center"> {/* Logo Container */}
          <div>
            <figure className=" border-red-500 m-2.5 flex justify-center">
              <img className="w-37.5 text-center" src="https://tv.selectra.com/sites/tv.selectra.com/files/styles/article_hero/public/images/logos/netflix-logo.png?itok=fCUER-69" alt="Logo" />
            </figure>
          </div>
        </div>
      </div>
      {<nav className=" border-blue-400  h-full w-[50%]  content-center pl-6">
        <Link href="/en" onFocus={() => {
          setActive("/en")           // cambia visual Rapido 
          router.replace("/en")       // Remplaza la ruta real 
        }}
          className={`outline-0 p-1.5 px-3 relative text-gray-300  transition
          ${active === "/en"
              ? " text-white"
              : "hover:text-white"}`}>
          Home

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
      <div className="  flex-1  border-blue-700 h-full justify-end items-center flex gap-2.5 pr-15">
        <div className="relative group  inline-block">

          <button className="bg-[#3b3a3a80] p-3 rounded-full focus:bg-white focus:text-black peer group-hover:bg-amber-50 cursor-pointer backdrop-blur-sm peer">
            <Notificacion className="w-5 h-5    group-hover:text-black  peer-focus:text-black" />
          </button>

          <div
            className="
      absolute right-0 top-full mt-2
      w-64 h-40
      
      bg-red-500 border  rounded-[10px]
      
      opacity-0
      scale-95
      translate-y-2
      pointer-events-none
      
      group-hover:opacity-100
      group-hover:scale-100
      group-hover:translate-y-0
      group-hover:pointer-events-auto
      
      transition-all duration-300 ease-out
      origin-top

      
      peer-focus:opacity-100
      peer-focus:scale-100
      peer-focus:translate-y-5
      peer-focus:pointer-events-auto
      
      
    "
          >
            Contenido 🔥
          </div>

        </div>



        <Link href="/Search" onFocus={() => {
          setActive("/Search")
          router.replace("/Search")
        }}
          className={`bg-[#3b3a3a80] group peer group-hover:bg-white peer hover:bg-white focus:bg-white  p-3.25 rounded-[30px] cursor-pointer blur[5px] borderoutline-0    transition
          ${active === "/Search"
              ? "bg-white text-black"
              : "hover:text-black"}
              `}
              >
          <div className="peer ">
            <Search className="w-5.5 -300  peer-focus:text-black group-focus:text-black group-hover:text-black  " />
          </div>
        </Link>
        <div className="relative group items-center  h-full content-center  inline-block">

          <button className="bg-[#3b3a3a80] w-12 rounded-full focus:bg-white focus:text-black peer group-hover:bg-amber-50 cursor-pointer backdrop-blur-sm peer">
            <img src="https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg" alt="" className="object-cover rounded-full" />
          </button>

          <div
            className="
      absolute right-0 top-full mt-2
      w-64 h-40
      
      bg-red-500 border  rounded-[10px]
      
      opacity-0
      scale-95
      translate-y-2
      pointer-events-none
      
      group-hover:opacity-100
      group-hover:scale-100
      group-hover:translate-y-0
      group-hover:pointer-events-auto
      
      transition-all duration-300 ease-out
      origin-top

      
      peer-focus:opacity-100
      peer-focus:scale-100
      peer-focus:translate-y-5
      peer-focus:pointer-events-auto
      
      
    "
          >
            Perfil 🔥
          </div>

        </div>
      </div>
    </header>
  </>

  );
}
