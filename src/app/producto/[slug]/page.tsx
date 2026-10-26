import React from 'react';
import { notFound } from 'next/navigation';
import { StoreRepository } from '@/lib/db/repository';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = StoreRepository.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const settings = StoreRepository.getSettings();

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <ProductDetailClient product={product} settings={settings} />
      </main>

      <Footer />
    </div>
  );
}
