import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { MapPin, Phone, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { StoreRepository } from '@/lib/db/repository';

export function Footer() {
  const settings = StoreRepository.getSettings();
  const address = settings.address || 'Stand de Venta Física • Lima, Perú';

  return (
    <footer id="footer" className="bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Columna 1: Marca & Logo Oficial Ampliado */}
          <div className="space-y-4 md:col-span-1">
            <div className="bg-white p-3 rounded-xl inline-block shadow-md">
              <BrandLogo size="md" showTagline={false} />
            </div>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Prendas deportivas de alto rendimiento, comodidad y estilo fitness para hombres y mujeres. Stand físico oficial y catálogo web conectado a inventario en tiempo real.
            </p>
            <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Colección Oficial &bull; Perú</span>
            </div>
          </div>

          {/* Columna 2: Ubicación y Stand Dinámico */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase">Punto de Atención</h4>
            <div className="flex items-start gap-2 text-neutral-200">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="font-semibold">{address}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pedidos directos por WhatsApp</span>
            </div>
            <p className="text-neutral-400 text-[11px] pt-1">
              Atención presencial: Lunes a Sábado de 10:00 am a 8:00 pm
            </p>
          </div>

          {/* Columna 3: Información Comercial */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase">Condiciones Comerciales</h4>
            <p className="text-neutral-300 text-xs">
              Precios expresados en <b>Soles Peruanos (PEN &bull; S/)</b>.
            </p>
            <p className="text-neutral-400 text-xs">
              Medios de pago disponibles: Efectivo, Yape, Plin, Tarjeta y Transferencia Bancaria.
            </p>
            <p className="text-neutral-400 text-xs">
              El pedido web por WhatsApp permite coordinar directamente con el vendedor sin comprometer stock antes del pago.
            </p>
          </div>

          {/* Columna 4: Accesos Rápidos Staff */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase">Acceso Staff Stand</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/login?redirect=/admin/pos" className="hover:text-white flex items-center gap-1.5 transition">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-neutral-200">Punto de Venta (POS)</span>
                </Link>
              </li>
              <li>
                <Link href="/login?redirect=/admin/caja" className="hover:text-white transition">
                  Caja Principal Compartida
                </Link>
              </li>
              <li>
                <Link href="/login?redirect=/admin/inventario" className="hover:text-white transition">
                  Control de Inventario y SKU
                </Link>
              </li>
              <li>
                <Link href="/login?redirect=/admin/productos" className="hover:text-white transition">
                  Gestión de Precios y Fotos
                </Link>
              </li>
              <li>
                <Link href="/login?redirect=/admin/reportes" className="hover:text-white transition">
                  Reportes y Exportación Excel
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            &copy; {new Date().getFullYear()} <b>ECLISSI STORE</b> &bull; {address}
          </div>
          <div className="flex items-center gap-1">
            <span>Sistema comercial y punto de venta</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
