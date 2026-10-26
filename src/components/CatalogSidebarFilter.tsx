'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, RotateCcw, X, SlidersHorizontal, Check } from 'lucide-react';

interface FilterOptions {
  sizes: string[];
  colors: string[];
  categories: { id: string; name: string }[];
  genders: { id: string; name: string }[];
}

interface CatalogSidebarFilterProps {
  filterOptions: FilterOptions;
  totalProducts: number;
}

const colorSwatchMap: Record<string, string> = {
  NEGRO: '#171717',
  BLANCO: '#F5F5F5',
  AZUL: '#1D4ED8',
  PLOMO: '#6B7280',
  ROJO: '#DC2626',
  VERDE: '#15803D',
  ROSADO: '#F472B6',
  'ROSADO BB': '#FBCFE8',
  LILA: '#A855F7',
  MORADO: '#7E22CE',
  TURQUESA: '#06B6D4',
  MOSTASA: '#D97706',
  NARAJA: '#EA580C',
};

export function CatalogSidebarFilter({ filterOptions, totalProducts }: CatalogSidebarFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados de los filtros
  const currentGender = searchParams.get('gender') || 'todos';
  const currentCategory = searchParams.get('category') || 'todos';
  const currentSize = searchParams.get('size') || 'todas';
  const currentColor = searchParams.get('color') || 'todos';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentInStock = searchParams.get('inStock') === 'true';

  // Acordeones abiertos/cerrados
  const [openSections, setOpenSections] = useState({
    sort: true,
    category: true,
    size: true,
    gender: true,
    color: true,
    stock: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFilter = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'todos' || value === 'todas') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`/?${params.toString()}#productos`, { scroll: false });
  };

  const handleClearAll = () => {
    router.push('/#productos', { scroll: false });
  };

  const hasActiveFilters =
    (currentGender && currentGender !== 'todos') ||
    (currentCategory && currentCategory !== 'todos') ||
    (currentSize && currentSize !== 'todas') ||
    (currentColor && currentColor !== 'todos') ||
    currentInStock ||
    (currentSort && currentSort !== 'newest');

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-6">
      {/* Cabecera del Sidebar estilo Gymshark: FILTER & SORT + Clear All */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-black" />
          <h2 className="text-sm font-black uppercase tracking-wider text-black">
            Filtros y Orden
          </h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-xs font-bold text-neutral-500 hover:text-black transition uppercase tracking-wider underline underline-offset-2"
          >
            Limpiar Todo
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-200 text-xs">
        {/* 1. SECCIÓN: ORDENAR POR (Radio buttons estilo referencia) */}
        <div className="py-4 space-y-3">
          <button
            onClick={() => toggleSection('sort')}
            className="w-full flex items-center justify-between font-black uppercase tracking-wider text-black text-left"
          >
            <span>Ordenar por</span>
            {openSections.sort ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {openSections.sort && (
            <div className="space-y-2 pt-1">
              {[
                { id: 'newest', label: 'Relevancia / Más Recientes' },
                { id: 'price_asc', label: 'Precio: Menor a Mayor' },
                { id: 'price_desc', label: 'Precio: Mayor a Menor' },
                { id: 'name_asc', label: 'Nombre: A - Z' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => updateFilter({ sort: opt.id })}
                  className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-black py-0.5 group"
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                    currentSort === opt.id ? 'border-black bg-black' : 'border-neutral-300 bg-white group-hover:border-black'
                  }`}>
                    {currentSort === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={`text-xs ${currentSort === opt.id ? 'font-bold text-black' : 'font-medium'}`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 2. SECCIÓN: GÉNERO */}
        <div className="py-4 space-y-3">
          <button
            onClick={() => toggleSection('gender')}
            className="w-full flex items-center justify-between font-black uppercase tracking-wider text-black text-left"
          >
            <span>Género</span>
            {openSections.gender ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {openSections.gender && (
            <div className="space-y-2 pt-1">
              {[
                { id: 'todos', label: 'Todos los Géneros' },
                { id: 'dama', label: 'Mujeres / Damas' },
                { id: 'hombre', label: 'Hombres' },
              ].map((g) => (
                <label
                  key={g.id}
                  onClick={() => updateFilter({ gender: g.id === 'todos' ? null : g.id })}
                  className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-black py-0.5 group"
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                    currentGender === g.id ? 'border-black bg-black text-white' : 'border-neutral-300 bg-white group-hover:border-black'
                  }`}>
                    {currentGender === g.id && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={`text-xs ${currentGender === g.id ? 'font-bold text-black' : 'font-medium'}`}>
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 3. SECCIÓN: CATEGORÍA DE PRODUCTO */}
        <div className="py-4 space-y-3">
          <button
            onClick={() => toggleSection('category')}
            className="w-full flex items-center justify-between font-black uppercase tracking-wider text-black text-left"
          >
            <span>Tipo de Producto / Categoría</span>
            {openSections.category ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {openSections.category && (
            <div className="space-y-2 pt-1">
              {[
                { id: 'todos', label: 'Todas las Categorías' },
                { id: 'ropa', label: 'Ropa Deportiva' },
                { id: 'accesorios', label: 'Accesorios & Complementos' },
              ].map((c) => (
                <label
                  key={c.id}
                  onClick={() => updateFilter({ category: c.id === 'todos' ? null : c.id })}
                  className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-black py-0.5 group"
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                    currentCategory === c.id ? 'border-black bg-black text-white' : 'border-neutral-300 bg-white group-hover:border-black'
                  }`}>
                    {currentCategory === c.id && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={`text-xs ${currentCategory === c.id ? 'font-bold text-black' : 'font-medium'}`}>
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 4. SECCIÓN: TALLA */}
        <div className="py-4 space-y-3">
          <button
            onClick={() => toggleSection('size')}
            className="w-full flex items-center justify-between font-black uppercase tracking-wider text-black text-left"
          >
            <span>Talla</span>
            {openSections.size ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {openSections.size && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => updateFilter({ size: null })}
                className={`py-1.5 px-2 text-center text-xs font-black uppercase rounded border transition ${
                  currentSize === 'todas'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'
                }`}
              >
                Todas
              </button>
              {filterOptions.sizes.map((sz) => {
                const isSelected = currentSize.toUpperCase() === sz.toUpperCase();
                return (
                  <button
                    key={sz}
                    onClick={() => updateFilter({ size: isSelected ? null : sz })}
                    className={`py-1.5 px-2 text-center text-xs font-black uppercase rounded border transition ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. SECCIÓN: COLOR */}
        <div className="py-4 space-y-3">
          <button
            onClick={() => toggleSection('color')}
            className="w-full flex items-center justify-between font-black uppercase tracking-wider text-black text-left"
          >
            <span>Color</span>
            {openSections.color ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {openSections.color && (
            <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
              <label
                onClick={() => updateFilter({ color: null })}
                className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-black py-1"
              >
                <div className={`w-3.5 h-3.5 rounded-full border ${currentColor === 'todos' ? 'border-black bg-black' : 'border-neutral-300'}`} />
                <span className={currentColor === 'todos' ? 'font-bold text-black' : 'font-medium'}>
                  Todos los Colores
                </span>
              </label>
              {filterOptions.colors.map((col) => {
                const isSelected = currentColor.toUpperCase() === col.toUpperCase();
                const swatch = colorSwatchMap[col.toUpperCase()] || '#6B7280';
                return (
                  <label
                    key={col}
                    onClick={() => updateFilter({ color: isSelected ? null : col })}
                    className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-black py-1 group"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                      style={{ background: swatch }}
                    />
                    <span className={`text-xs ${isSelected ? 'font-bold text-black' : 'font-medium'}`}>
                      {col}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-black ml-auto" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. SECCIÓN: DISPONIBILIDAD */}
        <div className="py-4 space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-neutral-800 hover:text-black">
            <input
              type="checkbox"
              checked={currentInStock}
              onChange={(e) => updateFilter({ inStock: e.target.checked ? 'true' : null })}
              className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
            />
            <span className="font-bold text-xs uppercase tracking-wide">
              Solo prendas en stock
            </span>
          </label>
        </div>
      </div>
    </aside>
  );
}
