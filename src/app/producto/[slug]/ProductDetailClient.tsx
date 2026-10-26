'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, ProductVariant } from '@/types';
import { useCart } from '@/context/CartContext';
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertTriangle,
  Send,
  Sparkles,
  MapPin,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductDetailClientProps {
  product: Product;
  settings: Record<string, any>;
}

export function ProductDetailClient({ product, settings }: ProductDetailClientProps) {
  const { addItem, setIsOpen } = useCart();
  const variants = product.variants || [];
  const images = product.images && product.images.length > 0
    ? product.images
    : (product.primary_image ? [{ id: 'img-1', product_id: product.id, storage_path: product.primary_image, is_primary: true, display_order: 0, created_at: '' }] : []);

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const isAllOutOfStock = totalStock === 0;

  // Galería de fotos (1 a 5 fotos)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const currentPhoto = images[activePhotoIdx]?.storage_path || product.primary_image;

  // Variante seleccionada
  const defaultVariant = variants.find((v) => v.stock > 0) || variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(defaultVariant?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || defaultVariant;
  const effectivePrice = selectedVariant?.effective_price ?? product.base_price;
  const isVariantOutOfStock = (selectedVariant?.stock ?? 0) === 0;

  const handleAddToCart = () => {
    if (!selectedVariant || isVariantOutOfStock) return;

    addItem({
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      productName: product.name,
      size: selectedVariant.size,
      color: selectedVariant.color,
      price: effectivePrice,
      quantity,
      maxStock: selectedVariant.stock,
      image: currentPhoto || product.primary_image,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const standAddress = settings.address || 'Stand de Venta Física • Lima, Perú';

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Regresar */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a todo el catálogo</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-10 shadow-sm">
        {/* Galería de Fotografías Gymshark-Style (1 a 5 Fotos con Miniaturas) */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] rounded-xl bg-[#F4F4F4] overflow-hidden flex items-center justify-center">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#F7F7F7] to-[#EAEAEA]">
                <div className="w-20 h-20 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-400 mb-3 shadow-sm bg-white">
                  <ShoppingBag className="w-10 h-10 stroke-1" />
                </div>
                <span className="text-xs font-black tracking-widest text-neutral-700 uppercase">
                  ECLISSI PERFORMANCE
                </span>
                <span className="text-[11px] text-neutral-400 mt-1">
                  Fotografía física disponible en stand
                </span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
              {isAllOutOfStock ? (
                <span className="px-3 py-1 bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded">
                  Agotado
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider rounded shadow-sm">
                  {totalStock} Disponibles
                </span>
              )}
            </div>

            {/* Wishlist */}
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition hover:scale-105"
              aria-label="Guardar en favoritos"
            >
              <Heart
                className={`w-5 h-5 ${
                  isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-700'
                }`}
              />
            </button>

            {/* Flechas para avanzar entre fotos si hay más de una */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-black shadow-md transition"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActivePhotoIdx((prev) => (prev + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-black shadow-md transition"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Miniaturas de Fotografías (1 a 5 Fotos) */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    activePhotoIdx === idx
                      ? 'border-black ring-2 ring-black/20 scale-105'
                      : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.storage_path}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {img.is_primary && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-white text-[8px] font-bold text-center uppercase py-0.5">
                      Principal
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ficha de Detalles y Compra Gymshark-Style */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 text-[11px] font-bold uppercase tracking-wider">
                {product.gender === 'dama' ? 'Damas' : 'Hombres'}
              </span>
              <span className="text-neutral-300">&bull;</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {product.category_name || 'Ropa Deportiva'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase">
              {product.name}
            </h1>

            {/* Precio */}
            <div className="flex items-baseline gap-3 pt-1">
              {effectivePrice <= 0 ? (
                <div className="space-y-0.5">
                  <span className="text-xl font-black text-neutral-800">S/ 0.00</span>
                  <p className="text-xs text-neutral-500 font-medium">
                    (Precio por confirmar en stand o por WhatsApp)
                  </p>
                </div>
              ) : (
                <span className="text-3xl font-black text-black tracking-tight">
                  S/ {effectivePrice.toFixed(2)}
                </span>
              )}
              <span className="text-xs text-neutral-500 font-semibold">PEN (Soles)</span>
            </div>

            {/* Selector de Tallas Gymshark */}
            <div className="space-y-2 pt-3 border-t border-neutral-100">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-700">
                <span>Seleccionar Talla y Color:</span>
                <span className="text-neutral-400 font-normal">
                  SKU: <b className="font-mono text-neutral-800">{selectedVariant?.sku}</b>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  const hasStock = v.stock > 0;

                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setQuantity(1);
                      }}
                      disabled={!hasStock}
                      className={`p-3 rounded-lg border text-left transition-all relative ${
                        isSelected
                          ? 'border-black bg-neutral-50 ring-1 ring-black'
                          : hasStock
                          ? 'border-neutral-200 bg-white hover:border-neutral-400'
                          : 'border-neutral-100 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs uppercase">
                        <span className="text-neutral-900">{v.size}</span>
                        <span className="text-[10px] text-neutral-500">
                          {hasStock ? `${v.stock} disp.` : 'Agotado'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {v.color}
                      </div>
                      {!hasStock && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-full h-[1px] bg-neutral-300 rotate-12" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Cantidad */}
            {!isVariantOutOfStock && (
              <div className="flex items-center gap-4 pt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Cantidad:
                </span>
                <div className="flex items-center border border-neutral-200 rounded-lg bg-neutral-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 text-sm font-black text-neutral-700 hover:text-black hover:bg-neutral-200 rounded-l-lg"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 text-xs font-black text-black">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(selectedVariant?.stock ?? 1, quantity + 1))
                    }
                    className="px-3 py-1 text-sm font-black text-neutral-700 hover:text-black hover:bg-neutral-200 rounded-r-lg"
                  >
                    +
                  </button>
                </div>
                <span className="text-[11px] text-neutral-500">
                  Máximo disponible: {selectedVariant?.stock ?? 0} unidades
                </span>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="space-y-3 pt-6 border-t border-neutral-200">
            <button
              onClick={handleAddToCart}
              disabled={isVariantOutOfStock || isAllOutOfStock}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm ${
                isVariantOutOfStock || isAllOutOfStock
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-black hover:bg-neutral-800 text-white active:scale-[0.99]'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Agregado a tu lista de pedido!</span>
                </>
              ) : isVariantOutOfStock || isAllOutOfStock ? (
                <span>Talla o Variante Agotada</span>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Agregar a Pedido WhatsApp</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsOpen(true)}
              className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ver Carrito y Enviar a WhatsApp</span>
            </button>

            {/* Ubicación Dinámica del Stand Físico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-neutral-100 text-[11px] text-neutral-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold">{standAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Inventario verificado en tiempo real</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
