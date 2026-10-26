'use client';

import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  inverted?: boolean;
}

export function BrandLogo({ className = '', size = 'md', showTagline = false, inverted = false }: BrandLogoProps) {
  // Proporciones ampliadas para mayor presencia de marca sin perder la estética
  const sizeClasses = {
    sm: 'h-11',
    md: 'h-14 sm:h-16',
    lg: 'h-20 sm:h-24',
    xl: 'h-28',
  };

  return (
    <Link href="/" className={`inline-flex items-center gap-3 group ${className}`} title="ECLISSI STORE - Ropa Deportiva">
      <div className="relative flex items-center py-1">
        <img
          src="/logo.png"
          alt="ECLISSI STORE"
          className={`${sizeClasses[size]} w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
            inverted ? 'brightness-110 filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)]' : ''
          }`}
        />
      </div>
      {showTagline && (
        <span className="text-[11px] tracking-wider text-neutral-500 uppercase font-bold hidden sm:inline border-l border-neutral-300 pl-3">
          Ropa Deportiva &bull; Stand Oficial
        </span>
      )}
    </Link>
  );
}
