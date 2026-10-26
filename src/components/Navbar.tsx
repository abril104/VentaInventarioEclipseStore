'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from './BrandLogo';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, Search, ShieldCheck, Menu, X, Heart, Sparkles, MapPin } from 'lucide-react';

export function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [standAddress, setStandAddress] = useState('Stand Comercial - Lima, Perú');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGender = searchParams.get('gender') || '';
  const currentCategory = searchParams.get('category') || '';

  // Cargar ubicación física dinámica desde configuración
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings?.address) {
          setStandAddress(data.settings.address);
        }
      } catch (e) {
        // fallback
      }
    }
    fetchSettings();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/?search=${encodeURIComponent(query)}#productos`);
    } else {
      router.push('/#productos');
    }
  };

  const navLinks = [
    { label: 'Mujeres', href: '/?gender=dama#productos', active: currentGender === 'dama' },
    { label: 'Hombres', href: '/?gender=hombre#productos', active: currentGender === 'hombre' },
    { label: 'Ropa', href: '/?category=ropa#productos', active: currentCategory === 'ropa' },
    { label: 'Accesorios', href: '/?category=accesorios#productos', active: currentCategory === 'accesorios' },
    { label: 'Ver Todo', href: '/#productos', active: !currentGender && !currentCategory && pathname === '/' },
  ];

  return (
    <>
      {/* Top Banner Gymshark-style con Ubicación Física Dinámica */}
      <div className="bg-black text-white text-[11px] font-semibold tracking-wider uppercase py-2 px-4 text-center flex items-center justify-center gap-3">
        <span className="flex items-center gap-1.5 text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ECLISSI STORE</span>
        </span>
        <span className="hidden sm:inline text-neutral-400">&bull;</span>
        <span className="flex items-center gap-1 text-neutral-200">
          <MapPin className="w-3 h-3 text-amber-400" />
          <span>{standAddress}</span>
        </span>
        <span className="hidden md:inline text-neutral-400">&bull;</span>
        <span className="hidden md:inline text-neutral-300">
          PEDIDOS WHATSAPP &bull; ENVÍOS A TODO EL PAÍS
        </span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between gap-4">
          
          {/* Lado Izquierdo: Categorías Principales (Desktop) / Hamburger (Mobile) */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-800 hover:text-black lg:hidden focus:outline-none"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <nav className="hidden lg:flex items-center gap-7 text-xs font-bold uppercase tracking-widest text-neutral-700">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative py-2 transition-colors hover:text-black ${
                    link.active
                      ? 'text-black font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black'
                      : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Centro: Logo Oficial ECLISSI STORE en tamaño grande y elegante */}
          <div className="flex-1 flex justify-center lg:justify-center">
            <BrandLogo size="md" />
          </div>

          {/* Lado Derecho: Buscador, Carrito WhatsApp y Botón Login / Punto de Venta */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Buscador Gymshark-style */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex relative w-56 lg:w-64">
              <input
                type="text"
                placeholder="¿Qué estás buscando?..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 border border-transparent hover:border-neutral-300 focus:border-black rounded-full pl-9 pr-4 py-2 text-xs font-medium text-neutral-900 placeholder-neutral-500 focus:bg-white focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5 pointer-events-none" />
            </form>

            {/* Botón Carrito WhatsApp */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2.5 rounded-full text-neutral-800 hover:text-black hover:bg-neutral-100 transition-colors flex items-center justify-center"
              title="Ver pedido WhatsApp"
              aria-label="Ver pedido WhatsApp"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Acceso Login / Punto de Venta del Stand */}
            <Link
              href="/login?redirect=/admin/pos"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm transition transform active:scale-95"
              title="Acceso al Punto de Venta (Iniciar Sesión)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Punto de Venta</span>
              <span className="sm:hidden">POS</span>
            </Link>
          </div>
        </div>

        {/* Menú Móvil desplegable */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200 px-6 py-6 space-y-5 animate-in slide-in-from-top duration-200 shadow-xl">
            {/* Buscador móvil */}
            <form onSubmit={(e) => { handleSearchSubmit(e); setMobileMenuOpen(false); }} className="relative">
              <input
                type="text"
                placeholder="Buscar prenda deportiva..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 border border-neutral-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-black"
              />
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            </form>

            <nav className="flex flex-col space-y-3 pt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-bold uppercase tracking-wider py-2 border-b border-neutral-100 flex items-center justify-between ${
                    link.active ? 'text-black font-extrabold' : 'text-neutral-600'
                  }`}
                >
                  <span>{link.label}</span>
                  <span className="text-neutral-400">&rarr;</span>
                </Link>
              ))}
              <Link
                href="/login?redirect=/admin/pos"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-black pt-2 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Acceso Punto de Venta / Login</span>
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
