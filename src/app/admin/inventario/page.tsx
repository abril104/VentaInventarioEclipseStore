'use client';

import React, { useState, useEffect } from 'react';
import { ProductVariant, InventoryMovement, UserProfile, Supplier } from '@/types';
import {
  Boxes,
  Search,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  History,
  Download,
  Filter,
  Check,
  RefreshCw,
  PackagePlus,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export default function InventoryPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'todos' | 'bajo' | 'agotado' | 'disponible'>('todos');
  const [sizeFilter, setSizeFilter] = useState('todas');
  const [colorFilter, setColorFilter] = useState('todos');

  // Modales
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  // Formulario Entrada
  const [entryQuantity, setEntryQuantity] = useState('1');
  const [entryCost, setEntryCost] = useState('');
  const [entrySupplier, setEntrySupplier] = useState('');
  const [entryReason, setEntryReason] = useState('Reposición de mercadería en stand');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Formulario Ajuste
  const [adjustType, setAdjustType] = useState<'ajuste_positivo' | 'ajuste_negativo' | 'devolucion'>('ajuste_positivo');
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userRes, searchRes, movRes] = await Promise.all([
        fetch('/api/auth/switch'),
        fetch('/api/pos/search?q='),
        fetch('/api/inventory/movements'),
      ]);
      const userData = await userRes.json();
      const searchData = await searchRes.json();

      setCurrentUser(userData.user);
      setVariants(searchData.variants || []);

      try {
        const movData = await movRes.json();
        setMovements(movData.movements || []);
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    try {
      const res = await fetch(`/api/pos/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setVariants(data.variants || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Opciones únicas de tallas y colores extraídas de los datos
  const uniqueSizes = Array.from(new Set(variants.map((v) => v.size.toUpperCase().trim()))).filter(Boolean);
  const uniqueColors = Array.from(new Set(variants.map((v) => v.color.toUpperCase().trim()))).filter(Boolean);

  const filteredVariants = variants.filter((v) => {
    // Filtro stock
    if (stockFilter === 'bajo' && !(v.stock <= v.low_stock_threshold && v.stock > 0)) return false;
    if (stockFilter === 'agotado' && v.stock !== 0) return false;
    if (stockFilter === 'disponible' && v.stock <= 0) return false;

    // Filtro talla
    if (sizeFilter !== 'todas' && v.size.toUpperCase().trim() !== sizeFilter.toUpperCase().trim()) return false;

    // Filtro color
    if (colorFilter !== 'todos' && v.color.toUpperCase().trim() !== colorFilter.toUpperCase().trim()) return false;

    return true;
  });

  // Procesar Entrada
  const handleExecuteEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant || !currentUser) return;

    setSubmittingEntry(true);
    try {
      const res = await fetch('/api/inventory/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          quantity: parseInt(entryQuantity, 10),
          cost_price: entryCost ? parseFloat(entryCost) : null,
          supplier_id: entrySupplier || null,
          reason: entryReason,
          registered_by: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEntryModalOpen(false);
      handleSearch(searchQuery);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Procesar Ajuste
  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant || !currentUser) return;

    setSubmittingAdjust(true);
    try {
      const res = await fetch('/api/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          type: adjustType,
          quantity: parseInt(adjustQuantity, 10),
          reason: adjustReason,
          registered_by: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdjustModalOpen(false);
      handleSearch(searchQuery);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-white">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-black uppercase tracking-wider">
              Control de Inventario Físico & Kardex
            </h2>
            <p className="text-neutral-500 text-xs">
              Existencias en tiempo real por SKU, alertas de stock bajo (&le; 1) y auditoría completa de movimientos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSearch(searchQuery)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition"
            title="Recargar inventario"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refrescar</span>
          </button>
          <a
            href="/api/excel/export?type=inventory"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar Excel</span>
          </a>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda por SKU */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Input Buscador SKU */}
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Buscar por SKU único (ej. LEG-NEG-M), prenda, color, talla..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-black rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none transition"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* Filtros de Stock */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setStockFilter('todos')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                stockFilter === 'todos'
                  ? 'bg-black text-white border-black'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-black'
              }`}
            >
              Todos ({variants.length})
            </button>
            <button
              onClick={() => setStockFilter('bajo')}
              className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
                stockFilter === 'bajo'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-neutral-50 border-neutral-200 text-amber-700 hover:border-amber-500'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stock Bajo</span>
            </button>
            <button
              onClick={() => setStockFilter('agotado')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                stockFilter === 'agotado'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-neutral-50 border-neutral-200 text-red-700 hover:border-red-500'
              }`}
            >
              Agotados
            </button>
            <button
              onClick={() => setStockFilter('disponible')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                stockFilter === 'disponible'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-neutral-50 border-neutral-200 text-emerald-700 hover:border-emerald-500'
              }`}
            >
              Con Stock
            </button>
          </div>
        </div>

        {/* Filtros Secundarios: Tallas y Colores */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-neutral-500 uppercase tracking-wider text-[11px]">Talla:</span>
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black"
            >
              <option value="todas">Todas las tallas</option>
              {uniqueSizes.map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-neutral-500 uppercase tracking-wider text-[11px]">Color:</span>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black"
            >
              <option value="todos">Todos los colores</option>
              {uniqueColors.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {(sizeFilter !== 'todas' || colorFilter !== 'todos' || stockFilter !== 'todos' || searchQuery) && (
            <button
              onClick={() => {
                setSizeFilter('todas');
                setColorFilter('todos');
                setStockFilter('todos');
                handleSearch('');
              }}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-black uppercase"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Existencias en Tiempo Real */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">SKU Único</th>
                <th className="py-3 px-4">Prenda / Modelo</th>
                <th className="py-3 px-4">Talla</th>
                <th className="py-3 px-4">Color</th>
                <th className="py-3 px-4 text-center">Stock Actual</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    Cargando existencias completas...
                  </td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No se encontraron variantes que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => {
                  const isOutOfStock = v.stock === 0;
                  const isLowStock = v.stock <= v.low_stock_threshold && v.stock > 0;

                  return (
                    <tr key={v.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                        {v.sku}
                      </td>
                      <td className="py-3 px-4 font-bold text-black">
                        {v.product_name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-700">
                        {v.size}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {v.color}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-sm">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            isOutOfStock
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {v.stock} un.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-neutral-900">
                        S/ {(v.effective_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold uppercase text-red-600">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold uppercase text-amber-700">
                            Stock Bajo (&le; 1)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-emerald-700">
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedVariant(v);
                            setEntryModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white font-bold rounded text-[11px] uppercase tracking-wider transition"
                        >
                          + Entrada
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVariant(v);
                            setAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 font-bold rounded text-[11px] uppercase tracking-wider transition"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial Kardex de Movimientos */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <History className="w-4 h-4 text-black" />
          <h3 className="text-sm font-black uppercase tracking-wider text-black">
            Últimos Movimientos de Kardex (Auditoría)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] border-b border-neutral-200">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">SKU / Prenda</th>
                <th className="py-2.5 px-3 text-center">Cant.</th>
                <th className="py-2.5 px-3 text-center">Previo &rarr; Nuevo</th>
                <th className="py-2.5 px-3">Motivo / Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {movements.slice(0, 15).map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50 transition">
                  <td className="py-2 px-3 text-neutral-500">{m.created_at}</td>
                  <td className="py-2 px-3 font-bold uppercase text-[10px]">
                    <span className={`px-2 py-0.5 rounded ${
                      m.type === 'venta' ? 'bg-blue-50 text-blue-800' :
                      m.type === 'compra' ? 'bg-emerald-50 text-emerald-800' :
                      m.type === 'reversion' ? 'bg-purple-50 text-purple-800' :
                      'bg-amber-50 text-amber-800'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-neutral-900">
                    <span className="font-mono text-neutral-600 mr-2">{m.variant_sku}</span>
                    <span>{m.product_name} ({m.size} - {m.color})</span>
                  </td>
                  <td className="py-2 px-3 text-center font-black">
                    {m.quantity}
                  </td>
                  <td className="py-2 px-3 text-center text-neutral-500">
                    {m.previous_stock} &rarr; <b className="text-black">{m.new_stock}</b>
                  </td>
                  <td className="py-2 px-3 text-neutral-600 text-[11px]">
                    {m.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Entrada de Mercadería */}
      {entryModalOpen && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-black uppercase text-black">
                Entrada de Stock &bull; {selectedVariant.sku}
              </h3>
              <button
                onClick={() => setEntryModalOpen(false)}
                className="text-neutral-400 hover:text-black font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteEntry} className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-neutral-500 block mb-0.5">Prenda:</span>
                <span className="font-bold text-black text-sm">{selectedVariant.product_name}</span>
                <span className="text-neutral-500 block">Talla: {selectedVariant.size} | Color: {selectedVariant.color}</span>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Cantidad a Ingresar:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entryQuantity}
                  onChange={(e) => setEntryQuantity(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-black font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Costo Unitario (S/ opcional):
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={entryCost}
                  onChange={(e) => setEntryCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-black font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Motivo:
                </label>
                <input
                  type="text"
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEntryModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEntry}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white font-black rounded-lg uppercase tracking-wider"
                >
                  {submittingEntry ? 'Guardando...' : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Inventario */}
      {adjustModalOpen && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-black uppercase text-black">
                Ajuste Auditado &bull; {selectedVariant.sku}
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-neutral-400 hover:text-black font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteAdjust} className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-neutral-500 block mb-0.5">Prenda:</span>
                <span className="font-bold text-black text-sm">{selectedVariant.product_name}</span>
                <span className="text-neutral-500 block">Stock Actual: <b className="text-black">{selectedVariant.stock} unidades</b></span>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Tipo de Ajuste:
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                >
                  <option value="ajuste_positivo">Ajuste Positivo (+ Sobrante / Encontrado)</option>
                  <option value="ajuste_negativo">Ajuste Negativo (- Merma / Pérdida / Dañado)</option>
                  <option value="devolucion">Devolución de Cliente (+ Vendible)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Cantidad:
                </label>
                <input
                  type="number"
                  min="1"
                  max={adjustType === 'ajuste_negativo' ? selectedVariant.stock : undefined}
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-black font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Motivo Justificado (Obligatorio para Auditoría):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Prenda dañada en exhibición / Conteo físico"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white font-black rounded-lg uppercase tracking-wider"
                >
                  {submittingAdjust ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
