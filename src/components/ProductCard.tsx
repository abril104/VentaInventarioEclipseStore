'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, ProductVariant } from '@/types';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, Heart, Check, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, setIsOpen } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hoveredSize, setHoveredSize] = useState<string | null>(null);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const variants = product.variants || [];
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const isOutOfStock = totalStock === 0;

  // Variantes únicas por talla
  const uniqueSizes = Array.from(new Set(variants.map((v) => v.size.toUpperCase().trim())));

  // Variante seleccionada
  const defaultVariant = variants.find((v) => v.stock > 0) || variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(defaultVariant?.id || '');
  const activeVariant = variants.find((v) => v.id === selectedVariantId) || defaultVariant;

  const priceToDisplay = activeVariant?.effective_price ?? product.base_price;
  const isZeroPrice = priceToDisplay <= 0;

  const handleQuickAddSize = (sizeStr: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Buscar la primera variante disponible de esa talla
    const matched = variants.find((v) => v.size.toUpperCase().trim() === sizeStr && v.stock > 0);
    if (!matched) return;

    setSelectedVariantId(matched.id);
    addItem({
      variantId: matched.id,
      sku: matched.sku,
      productName: product.name,
      size: matched.size,
      color: matched.color,
      price: matched.effective_price ?? product.base_price,
      quantity: 1,
      maxStock: matched.stock,
      image: product.primary_image,
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const handleDirectAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeVariant || activeVariant.stock <= 0) {
      setIsOpen(true);
      return;
    }

    addItem({
      variantId: activeVariant.id,
      sku: activeVariant.sku,
      productName: product.name,
      size: activeVariant.size,
      color: activeVariant.color,
      price: priceToDisplay,
      quantity: 1,
      maxStock: activeVariant.stock,
      image: product.primary_image,
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  return (
    <div
      className={`group relative flex flex-col bg-white transition-all duration-300 ${
        isOutOfStock ? 'opacity-70' : ''
      }`}
    >
      {/* Contenedor de Fotografía Gymshark-Style (Clean light gray background, tall aspect ratio) */}
      <div className="relative aspect-[3/4] bg-[#F4F4F4] rounded-lg overflow-hidden flex items-center justify-center">
        {/* Badges superiores: Nuevo / Sin stock */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 pointer-events-none">
          {isOutOfStock ? (
            <span className="px-2 py-0.5 bg-neutral-900 text-white font-extrabold text-[10px] uppercase tracking-wider rounded">
              Sin Stock
            </span>
          ) : product.is_new ? (
            <span className="px-2 py-0.5 bg-black text-white font-bold text-[10px] uppercase tracking-widest rounded">
              Nuevo
            </span>
          ) : null}
        </div>

        {/* Botón Wishlist / Favorito en esquina superior derecha */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-neutral-800 transition-all hover:scale-110 shadow-sm"
          title="Guardar en favoritos"
          aria-label="Favorito"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-700'
            }`}
          />
        </button>

        {/* Imagen del Producto o Placeholder Deportivo Minimalista */}
        <Link href={`/producto/${product.slug}`} className="w-full h-full block relative overflow-hidden">
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              className={`w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105 ${
                isOutOfStock ? 'grayscale contrast-75' : ''
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#F7F7F7] to-[#EBEBEB] text-neutral-400 group-hover:bg-[#EFEFEF] transition-colors">
              {/* Silueta deportiva atlética minimalista */}
              <div className="w-16 h-16 rounded-full border border-neutral-300 flex items-center justify-center mb-3">
                <ShoppingBag className="w-7 h-7 text-neutral-400 stroke-1" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                {product.gender === 'dama' ? 'Dama Performance' : 'Hombre Performance'}
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5">ECLISSI STORE</span>
            </div>
          )}
        </Link>

        {/* Barra de Selección Rápida de Tallas al Hover (Exacto al estilo Gymshark de la foto) */}
        {!isOutOfStock && uniqueSizes.length > 0 && (
          <div className="absolute inset-x-2 bottom-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
            <div className="bg-white/95 backdrop-blur-sm rounded border border-neutral-200/90 shadow-md p-1.5 flex items-center justify-between gap-1 overflow-x-auto">
              {uniqueSizes.map((sz) => {
                const variantForSize = variants.find(
                  (v) => v.size.toUpperCase().trim() === sz && v.stock > 0
                );
                const hasStock = Boolean(variantForSize);

                return (
                  <button
                    key={sz}
                    onClick={(e) => handleQuickAddSize(sz, e)}
                    disabled={!hasStock}
                    title={hasStock ? `Agregar talla ${sz} al pedido` : `Talla ${sz} sin existencias`}
                    className={`flex-1 py-1 px-1.5 text-center text-[10px] font-extrabold uppercase rounded transition-colors relative ${
                      hasStock
                        ? 'text-neutral-900 hover:bg-neutral-900 hover:text-white cursor-pointer active:scale-95'
                        : 'text-neutral-300 cursor-not-allowed overflow-hidden'
                    }`}
                  >
                    <span>{sz}</span>
                    {!hasStock && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-full h-[1px] bg-neutral-300 rotate-45 transform" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Información del Producto Gymshark-style (Under image) */}
      <div className="pt-3 pb-1 flex flex-col space-y-1">
        {/* Colección / Marca */}
        <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
          <span className="uppercase tracking-wider">
            {product.category_name || (product.gender === 'dama' ? 'Ropa Dama' : 'Ropa Hombre')}
          </span>
          {variants.length > 1 && (
            <span className="text-[10px] text-neutral-400 font-semibold">
              +{variants.length} opciones
            </span>
          )}
        </div>

        {/* Nombre del Producto */}
        <Link
          href={`/producto/${product.slug}`}
          className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-neutral-600 transition-colors line-clamp-1 leading-snug tracking-tight"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* Subtítulo: Color o Tallas disponibles */}
        <div className="text-[11px] text-neutral-500 truncate">
          {activeVariant?.color ? (
            <span>Color: {activeVariant.color}</span>
          ) : (
            <span>Tallas: {uniqueSizes.join(', ')}</span>
          )}
        </div>

        {/* Precio en Soles Peruanos */}
        <div className="pt-1 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            {isZeroPrice ? (
              <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded">
                S/ 0.00 &bull; Consultar
              </span>
            ) : (
              <span className="text-sm font-black text-neutral-900 tracking-tight">
                S/ {priceToDisplay.toFixed(2)}
              </span>
            )}
          </div>

          {/* Botón Agregar Rápido a Pedido WhatsApp */}
          {!isOutOfStock && (
            <button
              onClick={handleDirectAdd}
              className={`p-1.5 rounded-full transition-all text-xs flex items-center gap-1 ${
                addedAnimation
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 hover:bg-black hover:text-white text-neutral-800'
              }`}
              title="Agregar al pedido WhatsApp"
            >
              {addedAnimation ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
