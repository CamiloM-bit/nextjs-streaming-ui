import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Mono } from "next/font/google";
import { Suspense } from "react";
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import MediaLoader from '@/app/components/ui/loaders/MediaLoader'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoMono = Noto_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-mono",
  display: "swap",
});




export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" > 
      <body className=" h-auto overflow-y-none">
         <Navbar />    
         <Suspense fallback={<MediaLoader type="movies" />}>
           <section className=" h-screen  w-full relative">
             {children}
           </section>
           <Footer/>
         </Suspense>
      </body>
    </html>
  );
}
