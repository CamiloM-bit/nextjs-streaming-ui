import type { Metadata } from "next";
import SearchClient from "@/app/components/Search/SearchClient";

export const metadata: Metadata = {
  title: "Buscar Películas",
  description: "Busca películas y series en nuestra base de datos",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center bg-linear-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
        Explorar Películas
      </h1>
      <SearchClient />
    </div>
  );
}