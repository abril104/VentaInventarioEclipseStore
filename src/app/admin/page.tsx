'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Users,
  Award,
  ArrowRight,
  Receipt,
  Download,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/dashboard/metrics');
      const data = await res.json();
      setMetrics(data.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
            Resumen Operativo & Comercial
          </span>
          <h2 className="text-xl font-black text-white tracking-wide uppercase mt-0.5">
            Dashboard de Ventas & Inventario
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/pos"
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/40 transition flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ir al Punto de Venta</span>
          </Link>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas de Hoy</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            S/ {(metrics?.todaySalesTotal || 0).toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {metrics?.todaySalesCount || 0} operaciones registradas
          </span>
        </div>

        {/* Unidades Disponibles */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Disponible</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {metrics?.availableUnits || 0} unid
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            En {metrics?.totalVariants || 0} variantes activas
          </span>
        </div>

        {/* Alertas de Stock Bajo (<= 1) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Bajo (&le; 1)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {metrics?.lowStockVariants || 0}
          </div>
          <Link href="/admin/inventario" className="text-[10px] text-amber-300/80 hover:underline block mt-1">
            Requieren reposición inmediata &rarr;
          </Link>
        </div>

        {/* Variantes Agotadas (0) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Agotados (0 stock)</span>
            <Boxes className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400">
            {metrics?.outOfStockVariants || 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Visibles como &laquo;Sin stock&raquo;
          </span>
        </div>
      </div>

      {/* Grid: Ventas por Vendedor | Ventas por Canal | Ventas por Medio de Pago */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Atribución por Vendedor */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Ventas por Vendedor</span>
            </span>
          </div>

          <div className="space-y-2">
            {metrics?.salesBySeller?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No hay ventas registradas aún.</p>
            ) : (
              metrics?.salesBySeller?.map((s: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{s.seller_name}</span>
                    <span className="text-[10px] text-slate-400">{s.sales_count} ventas realizadas</span>
                  </div>
                  <span className="font-black text-cyan-400">
                    S/ {Number(s.total_amount).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ventas por Canal */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Ventas por Canal</span>
            </span>
          </div>

          <div className="space-y-2">
            {metrics?.salesByChannel?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No hay ventas registradas aún.</p>
            ) : (
              metrics?.salesByChannel?.map((c: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white uppercase block">
                      {c.channel === 'pos' ? 'Presencial (POS Stand)' : 'WhatsApp Web'}
                    </span>
                    <span className="text-[10px] text-slate-400">{c.count} operaciones</span>
                  </div>
                  <span className="font-black text-emerald-400">
                    S/ {Number(c.total).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ventas por Medio de Pago */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-fuchsia-400" />
              <span>Medios de Pago</span>
            </span>
          </div>

          <div className="space-y-2">
            {metrics?.salesByPaymentMethod?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No hay cobros registrados aún.</p>
            ) : (
              metrics?.salesByPaymentMethod?.map((p: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white capitalize block">{p.payment_method}</span>
                    <span className="text-[10px] text-slate-400">{p.count} cobros</span>
                  </div>
                  <span className="font-black text-fuchsia-400">
                    S/ {Number(p.total).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Prendas Más Vendidas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Top 10 Prendas Más Vendidas
            </h3>
          </div>
          <Link href="/admin/reportes" className="text-xs font-bold text-cyan-400 hover:underline">
            Ver Reporte Completo &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Prenda Deportiva</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Talla</th>
                <th className="py-2.5 px-3">Color</th>
                <th className="py-2.5 px-3 text-center">Unid Vendidas</th>
                <th className="py-2.5 px-3 text-right">Recaudación Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metrics?.topProducts?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Aún no hay ventas registradas para generar el ranking de prendas.
                  </td>
                </tr>
              ) : (
                metrics?.topProducts?.map((tp: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-white">{tp.product_name}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{tp.sku}</td>
                    <td className="py-2.5 px-3 text-slate-300">{tp.size}</td>
                    <td className="py-2.5 px-3 text-slate-300">{tp.color}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                      {tp.total_sold} unid
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-white">
                      S/ {Number(tp.total_revenue).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
