import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { WhatsAppCartDrawer } from '@/components/WhatsAppCartDrawer';

export const metadata: Metadata = {
  title: 'Eclipse Store | Ropa Deportiva & Fitness - Stand Físico & Catálogo Web',
  description: 'Prendas deportivas para hombres y mujeres en Lima, Perú. Tops, leggings, conjuntos, casacas, polos y más.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
        <CartProvider>
          {children}
          <WhatsAppCartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
