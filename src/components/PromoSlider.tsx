'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

export interface SlideItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  button_text?: string;
  link_url?: string;
  bg_color?: string;
  image_url?: string;
}

export interface SliderConfig {
  speed_ms: number;
  autoplay: boolean;
  slides: SlideItem[];
}

interface PromoSliderProps {
  initialConfig?: SliderConfig;
}

export function PromoSlider({ initialConfig }: PromoSliderProps) {
  const [config, setConfig] = useState<SliderConfig>(() => {
    if (initialConfig && initialConfig.slides && initialConfig.slides.length > 0) {
      return initialConfig;
    }
    return {
      speed_ms: 5000,
      autoplay: true,
      slides: [
        {
          id: 'slide-1',
          title: 'NUEVA COLECCIÓN ATHLETIC 2026',
          subtitle: 'Prendas de alta compresión y estilo fitness diseñadas para alto rendimiento.',
          badge: 'COLECCIÓN OFICIAL',
          button_text: 'Ver Catálogo',
          link_url: '#productos',
          bg_color: '#000000',
          image_url: '',
        },
        {
          id: 'slide-2',
          title: 'VISÍTANOS EN NUESTRO STAND FÍSICO',
          subtitle: 'Pruébate las prendas y retira al instante con atención personalizada en Lima.',
          badge: 'STAND OFICIAL',
          button_text: 'Ver Horarios y Stand',
          link_url: '#footer',
          bg_color: '#171717',
          image_url: '',
        },
        {
          id: 'slide-3',
          title: 'PEDIDOS DIRECTOS POR WHATSAPP',
          subtitle: 'Envíos a todo el Perú en Soles (PEN). Consulta disponibilidad en tiempo real.',
          badge: 'ENVÍOS SEGUROS',
          button_text: 'Hacer Pedido',
          link_url: '#productos',
          bg_color: '#0A0A0A',
          image_url: '',
        },
      ],
    };
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slides = config.slides || [];

  // Autoplay
  useEffect(() => {
    if (!config.autoplay || slides.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, Math.max(2000, config.speed_ms || 5000));

    return () => clearInterval(interval);
  }, [config.autoplay, config.speed_ms, slides.length, isPaused]);

  if (slides.length === 0) return null;

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const activeSlide = slides[currentIndex] || slides[0];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-800 shadow-xl bg-black my-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Contenedor del Slide Activo */}
      <div
        className="relative min-h-[220px] sm:min-h-[280px] md:min-h-[320px] flex items-center justify-between px-12 py-8 sm:px-16 sm:py-10 md:px-20 md:py-12 transition-all duration-700 ease-out"
        style={{
          backgroundColor: activeSlide.bg_color || '#000000',
          backgroundImage: activeSlide.image_url ? `url(${activeSlide.image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay si hay imagen de fondo para mantener legibilidad atlética */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30 pointer-events-none" />

        {/* Textos y contenido del slide con margen seguro para nunca chocar con las flechas */}
        <div className="relative z-10 max-w-xl sm:max-w-2xl space-y-2.5 sm:space-y-4">
          {activeSlide.badge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-400 text-[10px] sm:text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeSlide.badge}</span>
            </div>
          )}

          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight">
            {activeSlide.title}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-neutral-300 font-medium max-w-lg leading-relaxed">
            {activeSlide.subtitle}
          </p>

          {activeSlide.button_text && (
            <div className="pt-2">
              <Link
                href={activeSlide.link_url || '#productos'}
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-lg shadow-lg transition transform active:scale-95"
              >
                <span>{activeSlide.button_text}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Flechas de Navegación Manual: Compactas, discretas y fuera del área de texto */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black text-white/90 hover:text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 shadow-md"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black text-white/90 hover:text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 shadow-md"
              aria-label="Slide siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </>
        )}

        {/* Indicadores / Dots en la parte inferior */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === idx
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir al slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
