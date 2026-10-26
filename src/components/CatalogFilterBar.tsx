'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, Check, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterOptions {
  sizes: string[];
  colors: string[];
  categories: { id: string; name: string }[];
  genders: { id: string; name: string }[];
}

interface CatalogFilterBarProps {
  filterOptions: FilterOptions;
  totalProducts: number;
}

// Mapa de colores a códigos CSS
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
  VARIADO: 'linear-gradient(45deg, #171717, #DC2626, #1D4ED8)',
};

export function CatalogFilterBar({ filterOptions, totalProducts }: CatalogFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados de los filtros desde la URL
  const currentGender = searchParams.get('gender') || 'todos';
  const currentCategory = searchParams.get('category') || 'todos';
  const currentSize = searchParams.get('size') || 'todas';
  const currentColor = searchParams.get('color') || 'todos';
  const currentSearch = searchParams.get('search') || '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentSort = searchParams.get('sort') || 'newest';

  // Modal / Acordeón para filtros avanzados en móvil o desktop
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Actualizador genérico de parámetros URL
  const updateFilter = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Siempre resetear la página a 1 cuando se cambia un filtro
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

  const handleResetFilters = () => {
    router.push('/#productos', { scroll: false });
  };

  const hasActiveFilters =
    (currentGender && currentGender !== 'todos') ||
    (currentCategory && currentCategory !== 'todos') ||
    (currentSize && currentSize !== 'todas') ||
    (currentColor && currentColor !== 'todos') ||
    currentInStock ||
    Boolean(currentSearch);

  return (
    <div className="w-full bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Fila 1: Pestañas de Género Gymshark-style y Botón de Filtros Avanzados */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        {/* Selector de Género Principal */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-2 hidden sm:inline">
            Género:
          </span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'dama', label: 'Mujeres' },
            { id: 'hombre', label: 'Hombres' },
          ].map((g) => {
            const active = currentGender === g.id;
            return (
              <button
                key={g.id}
                onClick={() => updateFilter({ gender: g.id === 'todos' ? null : g.id })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        {/* Categoría: Ropa vs Accesorios */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-2 hidden sm:inline">
            Categoría:
          </span>
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'ropa', label: 'Ropa' },
            { id: 'accesorios', label: 'Accesorios' },
          ].map((c) => {
            const active = currentCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => updateFilter({ category: c.id === 'todos' ? null : c.id })}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {c.label}
              </button>
            );
          })}

          {/* Toggle Filtros Avanzados (Tallas, Colores, Stock) */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`ml-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-colors ${
              showAdvanced || hasActiveFilters
                ? 'border-black bg-neutral-50 text-black'
                : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Fila 2: Filtros desplegables (Tallas, Colores, Solo Disponibles, Orden) */}
      {showAdvanced && (
        <div className="space-y-4 pt-2 animate-in fade-in duration-200">
          {/* Tallas */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center justify-between">
              <span>Filtrar por Talla:</span>
              {currentSize !== 'todas' && (
                <button
                  onClick={() => updateFilter({ size: null })}
                  className="text-[11px] text-neutral-500 hover:text-black font-semibold"
                >
                  Restablecer
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => updateFilter({ size: null })}
                className={`px-3 py-1 text-xs font-extrabold uppercase rounded border transition-colors ${
                  currentSize === 'todas'
                    ? 'bg-black text-white border-black'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                Todas
              </button>
              {filterOptions.sizes.map((sz) => {
                const active = currentSize.toUpperCase() === sz.toUpperCase();
                return (
                  <button
                    key={sz}
                    onClick={() => updateFilter({ size: active ? null : sz })}
                    className={`px-3 py-1 text-xs font-extrabold uppercase rounded border transition-all ${
                      active
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colores */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center justify-between">
              <span>Filtrar por Color:</span>
              {currentColor !== 'todos' && (
                <button
                  onClick={() => updateFilter({ color: null })}
                  className="text-[11px] text-neutral-500 hover:text-black font-semibold"
                >
                  Restablecer
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => updateFilter({ color: null })}
                className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-colors ${
                  currentColor === 'todos'
                    ? 'bg-black text-white border-black'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                Todos
              </button>
              {filterOptions.colors.slice(0, 14).map((col) => {
                const active = currentColor.toUpperCase() === col.toUpperCase();
                const swatch = colorSwatchMap[col.toUpperCase()] || '#9CA3AF';

                return (
                  <button
                    key={col}
                    onClick={() => updateFilter({ color: active ? null : col })}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase rounded border transition-all ${
                      active
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-neutral-300"
                      style={{ background: swatch }}
                    />
                    <span>{col}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opciones Adicionales: Stock y Orden */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-100">
            {/* Solo prendas con stock */}
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={currentInStock}
                onChange={(e) => updateFilter({ inStock: e.target.checked ? 'true' : null })}
                className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
              />
              <span>Mostrar solo prendas con stock disponible</span>
            </label>

            {/* Ordenamiento */}
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
              <span>Ordenar:</span>
              <select
                value={currentSort}
                onChange={(e) => updateFilter({ sort: e.target.value })}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="newest">Más recientes</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="name_asc">Nombre (A - Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Fila 3: Chips de Filtros Activos y Contador de Resultados */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-neutral-600">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-800">
            Mostrando <b>{totalProducts}</b> prendas deportivas
          </span>

          {/* Chips eliminables */}
          {currentGender !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold border border-neutral-200">
              Género: {currentGender === 'dama' ? 'Mujeres' : 'Hombres'}
              <button
                onClick={() => updateFilter({ gender: null })}
                className="hover:text-red-500 font-extrabold ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {currentCategory !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold border border-neutral-200">
              Categoría: {currentCategory}
              <button
                onClick={() => updateFilter({ category: null })}
                className="hover:text-red-500 font-extrabold ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {currentSize !== 'todas' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold border border-neutral-200">
              Talla: {currentSize}
              <button
                onClick={() => updateFilter({ size: null })}
                className="hover:text-red-500 font-extrabold ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {currentColor !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold border border-neutral-200">
              Color: {currentColor}
              <button
                onClick={() => updateFilter({ color: null })}
                className="hover:text-red-500 font-extrabold ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {currentSearch && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200">
              Búsqueda: &ldquo;{currentSearch}&rdquo;
              <button
                onClick={() => updateFilter({ search: null })}
                className="hover:text-red-500 font-extrabold ml-1"
              >
                &times;
              </button>
            </span>
          )}
        </div>

        {/* Botón Restablecer todo si hay algún filtro activo */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-black transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar todos los filtros</span>
          </button>
        )}
      </div>
    </div>
  );
}
