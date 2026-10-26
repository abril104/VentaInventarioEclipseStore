'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Boxes,
  Wallet,
  AlertCircle,
} from 'lucide-react';

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Centro de Reportes Comerciales & Exportación
            </h2>
            <p className="text-slate-400 text-xs">
              Métricas financieras transparentes, balance de caja y descarga de datos oficiales en Excel.
            </p>
          </div>
        </div>

        {/* Botones de Descarga Excel */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/excel/export?type=sales"
            download
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Excel Ventas</span>
          </a>
          <a
            href="/api/excel/export?type=inventory"
            download
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Excel Inventario</span>
          </a>
          <a
            href="/api/excel/export?type=movements"
            download
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Excel Kardex</span>
          </a>
        </div>
      </div>

      {/* Tarjetas de Claridad Contable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Ingresos por Ventas</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            S/ {(metrics?.todaySalesTotal || 0).toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-400">
            Total bruto facturado en la jornada. (No confundir con utilidad líquida).
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Control de Margen & Costos</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-300">
            Pendiente de Costeo Completo
          </div>
          <p className="text-[10px] text-slate-400">
            Los precios del Excel son de venta al público. Los márgenes netos se calcularán según se ingresen costos reales en Compras.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Unidades en Stand</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {metrics?.availableUnits || 0} prendas
          </div>
          <p className="text-[10px] text-slate-400">
            Existencias físicas auditadas por SKU y variante.
          </p>
        </div>
      </div>

      {/* Exportadores Dedicados */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Módulos de Auditoría y Exportación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-white text-sm">Libro de Ventas y Cobros</h4>
              <p className="text-xs text-slate-400 mt-1">
                Detalle por número de comprobante, vendedor, canal (POS o WhatsApp), desglose de medios de pago y descuentos.
              </p>
            </div>
            <a
              href="/api/excel/export?type=sales"
              download
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Descargar .XLSX</span>
            </a>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-white text-sm">Inventario Físico & Variantes</h4>
              <p className="text-xs text-slate-400 mt-1">
                Catálogo consolidado por SKU, prenda, talla, color, precio de venta en soles, proveedor y stock actual.
              </p>
            </div>
            <a
              href="/api/excel/export?type=inventory"
              download
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Descargar .XLSX</span>
            </a>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-white text-sm">Kardex Inmutable de Movimientos</h4>
              <p className="text-xs text-slate-400 mt-1">
                Trazabilidad total: ventas, compras, devoluciones vendibles, ajustes y usuario responsable de cada acción.
              </p>
            </div>
            <a
              href="/api/excel/export?type=movements"
              download
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Descargar .XLSX</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
