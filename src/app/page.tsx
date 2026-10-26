import React from 'react';
import { StoreRepository } from '@/lib/db/repository';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { CatalogSidebarFilter } from '@/components/CatalogSidebarFilter';
import { CatalogPagination } from '@/components/CatalogPagination';
import { PromoSlider } from '@/components/PromoSlider';
import { Sparkles, ShoppingBag, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import Link from 'next/link';

interface HomePageProps {
  searchParams: Promise<{
    gender?: string;
    category?: string;
    categoryId?: string;
    size?: string;
    color?: string;
    search?: string;
    inStock?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const currentGender = params.gender || 'todos';
  const currentCategory = params.category || 'todos';
  const currentSize = params.size || 'todas';
  const currentColor = params.color || 'todos';
  const searchQuery = params.search || '';
  const inStockOnly = params.inStock === 'true';
  const sort = params.sort || 'newest';

  // Configuración de la tienda y del slider promocional
  const settings = StoreRepository.getSettings();
  const sliderConfig = StoreRepository.getSliderSettings();

  // Obtener productos filtrados desde el repositorio
  const products = StoreRepository.getProducts({
    gender: currentGender !== 'todos' ? currentGender : undefined,
    category: currentCategory !== 'todos' ? currentCategory : undefined,
    categoryId: params.categoryId,
    size: currentSize !== 'todas' ? currentSize : undefined,
    color: currentColor !== 'todos' ? currentColor : undefined,
    search: searchQuery || undefined,
    onlyPublished: true,
    inStockOnly,
  });

  // Opciones dinámicas para la barra de filtros
  const filterOptions = StoreRepository.getFilterOptions();

  // Ordenamiento en memoria
  if (sort === 'price_asc') {
    products.sort((a, b) => {
      const priceA = a.variants?.[0]?.effective_price ?? a.base_price;
      const priceB = b.variants?.[0]?.effective_price ?? b.base_price;
      return priceA - priceB;
    });
  } else if (sort === 'price_desc') {
    products.sort((a, b) => {
      const priceA = a.variants?.[0]?.effective_price ?? a.base_price;
      const priceB = b.variants?.[0]?.effective_price ?? b.base_price;
      return priceB - priceA;
    });
  } else if (sort === 'name_asc') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Paginación: 12 prendas por página
  const PAGE_SIZE = 12;
  const totalProducts = products.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, parseInt(params.page || '1', 10) || 1), totalPages);

  const paginatedProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Título dinámico para la cabecera
  let collectionTitle = 'CATÁLOGO DEPORTIVO COMPLETO';
  if (currentGender === 'dama') {
    collectionTitle = 'COLECCIÓN FITNESS & DEPORTIVA DAMAS';
  } else if (currentGender === 'hombre') {
    collectionTitle = 'COLECCIÓN DEPORTIVA HOMBRES';
  } else if (currentCategory === 'accesorios') {
    collectionTitle = 'ACCESORIOS & COMPLEMENTOS';
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-8">
        {/* Slider Promocional Administrable (Justo encima del catálogo deportivo) */}
        <PromoSlider initialConfig={sliderConfig} />

        {/* Cabecera de la Colección */}
        <div id="productos" className="pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{settings.store_name || 'ECLISSI STORE'} &bull; STAND OFICIAL</span>
              <span>&bull;</span>
              <span className="text-black font-extrabold">{settings.address || 'Stand Comercial - Lima, Perú'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-black">
              {collectionTitle}
            </h1>
          </div>

          <div className="text-xs font-semibold text-neutral-500">
            Mostrando <b>{totalProducts}</b> prendas deportivas en catálogo
          </div>
        </div>

        {/* Layout Principal: Filtros al costado izquierdo + Cuadrícula de productos a la derecha */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Sidebar de Filtros (Izquierda) */}
          <CatalogSidebarFilter
            filterOptions={filterOptions}
            totalProducts={totalProducts}
          />

          {/* Cuadrícula de Productos y Paginación (Derecha) */}
          <div className="flex-1 w-full space-y-8">
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-20 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-4 px-4">
                <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto text-neutral-500">
                  <ShoppingBag className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  No se encontraron prendas para este filtro
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Prueba cambiando la talla, el color o restablece los filtros para ver todo el catálogo disponible.
                </p>
                <Link
                  href="/#productos"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition"
                >
                  <span>Ver todas las prendas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Paginación */}
            <CatalogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalProducts}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
