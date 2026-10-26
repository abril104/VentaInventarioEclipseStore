'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export function CatalogPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: CatalogPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/?${params.toString()}#productos`, { scroll: true });
  };

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-neutral-200">
      <span className="text-xs font-semibold text-neutral-500">
        Mostrando <b className="text-neutral-900">{startItem}</b> a <b className="text-neutral-900">{endItem}</b> de{' '}
        <b className="text-neutral-900">{totalItems}</b> prendas
      </span>

      <div className="flex items-center gap-1.5">
        {/* Botón Anterior */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`p-2 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
            currentPage <= 1
              ? 'opacity-40 cursor-not-allowed border-neutral-200 text-neutral-400'
              : 'hover:bg-neutral-100 border-neutral-200 text-neutral-800'
          }`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números de página */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 text-neutral-400 text-xs font-bold">
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isCurrent = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => goToPage(pageNum)}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                isCurrent
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Botón Siguiente */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`p-2 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
            currentPage >= totalPages
              ? 'opacity-40 cursor-not-allowed border-neutral-200 text-neutral-400'
              : 'hover:bg-neutral-100 border-neutral-200 text-neutral-800'
          }`}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
