import type { Metadata } from "next";
import SearchClient from "@/app/components/Search/SearchClient";

export const metadata: Metadata = {
  title: "Buscar Películas",
  description: "Busca películas y series en nuestra base de datos",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <SearchClient />
    </div>
  );
}