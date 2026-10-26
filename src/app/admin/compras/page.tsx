'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, ProductVariant, UserProfile } from '@/types';
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  PackageCheck,
  ChevronDown,
  ChevronRight,
  Receipt,
  Users,
  Check,
  X,
  PlusCircle,
  Trash2,
} from 'lucide-react';

interface PurchaseItemForm {
  variantId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitCost: number;
}

export default function PurchasesPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'compras' | 'proveedores'>('compras');

  // Modal Nueva Compra
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Búsqueda de variantes para agregar a la compra
  const [variantSearch, setVariantSearch] = useState('');
  const [variantResults, setVariantResults] = useState<ProductVariant[]>([]);

  // Crear Proveedor Modal/Form
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // Acordeón de compras
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes, sRes] = await Promise.all([
        fetch('/api/auth/switch'),
        fetch('/api/purchases'),
        fetch('/api/suppliers'),
      ]);
      const uData = await uRes.json();
      const pData = await pRes.json();
      const sData = await sRes.json();

      setCurrentUser(uData.user);
      setPurchases(pData.purchases || []);
      setSuppliers(sData.suppliers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchVariants = async (q: string) => {
    setVariantSearch(q);
    if (!q.trim()) {
      setVariantResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/pos/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setVariantResults(data.variants || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addItemToPurchase = (v: ProductVariant) => {
    if (purchaseItems.some((item) => item.variantId === v.id)) {
      alert('Esta prenda ya fue agregada al detalle de compra.');
      return;
    }

    setPurchaseItems((prev) => [
      ...prev,
      {
        variantId: v.id,
        sku: v.sku,
        productName: v.product_name || 'Prenda',
        size: v.size,
        color: v.color,
        quantity: 1,
        unitCost: v.cost_price || 0,
      },
    ]);
    setVariantSearch('');
    setVariantResults([]);
  };

  const updateItemQty = (variantId: string, qty: number) => {
    setPurchaseItems((prev) =>
      prev.map((it) => (it.variantId === variantId ? { ...it, quantity: Math.max(1, qty) } : it))
    );
  };

  const updateItemCost = (variantId: string, cost: number) => {
    setPurchaseItems((prev) =>
      prev.map((it) => (it.variantId === variantId ? { ...it, unitCost: Math.max(0, cost) } : it))
    );
  };

  const removeItem = (variantId: string) => {
    setPurchaseItems((prev) => prev.filter((it) => it.variantId !== variantId));
  };

  const totalPurchaseCost = purchaseItems.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || purchaseItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplierId || null,
          registered_by: currentUser.id,
          invoice_ref: invoiceRef,
          notes,
          items: purchaseItems.map((it) => ({
            variant_id: it.variantId,
            quantity: it.quantity,
            unit_cost: it.unitCost,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`¡Compra ${data.purchase.purchase_number} registrada con éxito! El inventario se actualizó.`);
      setIsModalOpen(false);
      setPurchaseItems([]);
      setInvoiceRef('');
      setNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    setCreatingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewSupplierName('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingSupplier(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-950 border border-teal-700/50 flex items-center justify-center text-teal-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Compras, Reposiciones & Proveedores
            </h2>
            <p className="text-slate-400 text-xs">
              Registro formal de entradas de mercadería al stand, costos de adquisición y control de proveedores.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-teal-950/40 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nueva Compra</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab('compras')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'compras'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Historial de Compras ({purchases.length})
        </button>
        <button
          onClick={() => setTab('proveedores')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'proveedores'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Proveedores ({suppliers.length})
        </button>
      </div>

      {/* Contenido según Tab */}
      {tab === 'compras' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Cargando compras...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              No hay compras registradas aún. Haz clic en &laquo;Registrar Nueva Compra&raquo; para ingresar mercadería.
            </div>
          ) : (
            purchases.map((pur) => {
              const isExpanded = expandedPurchaseId === pur.id;
              const items = pur.items || [];
              const totalUnits = items.reduce((sum: number, it: any) => sum + it.quantity, 0);

              return (
                <div
                  key={pur.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition"
                >
                  <div
                    onClick={() => setExpandedPurchaseId(isExpanded ? null : pur.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-300 text-xs">
                            {pur.purchase_number}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            Recibida (+ Stock)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Proveedor: <b>{pur.supplier_name || 'No especificado'}</b> &bull; {totalUnits} unidades &bull; Registrado por {pur.registered_by_name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Costo Total</span>
                      <span className="text-base font-black text-white">
                        S/ {Number(pur.total_cost).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Detalle Desplegable */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Prendas Recibidas en esta Compra:
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-3">SKU</th>
                              <th className="py-2 px-3">Prenda</th>
                              <th className="py-2 px-3">Talla & Color</th>
                              <th className="py-2 px-3 text-center">Cantidad</th>
                              <th className="py-2 px-3 text-right">Costo Unit. S/</th>
                              <th className="py-2 px-3 text-right">Subtotal S/</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {items.map((it: any) => (
                              <tr key={it.id}>
                                <td className="py-2 px-3 font-mono font-bold text-cyan-300">{it.sku}</td>
                                <td className="py-2 px-3 font-bold text-white">{it.product_name}</td>
                                <td className="py-2 px-3 text-slate-300">{it.size} - {it.color}</td>
                                <td className="py-2 px-3 text-center font-bold text-emerald-400">+{it.quantity}</td>
                                <td className="py-2 px-3 text-right text-slate-400">S/ {Number(it.unit_cost).toFixed(2)}</td>
                                <td className="py-2 px-3 text-right font-black text-white">S/ {Number(it.subtotal).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Tab Proveedores */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <form onSubmit={handleCreateSupplier} className="flex-1 max-w-md flex items-center gap-2">
              <input
                type="text"
                placeholder="Nombre de nuevo proveedor (ej. Confecciones Lima)..."
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={creatingSupplier || !newSupplierName.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shrink-0"
              >
                + Agregar
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {suppliers.map((s) => (
              <div key={s.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="font-bold text-white text-sm block">{s.name}</span>
                <span className="text-xs text-slate-400 block">Proveedor Registrado</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Registrar Compra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Recepción de Mercadería & Reposición
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Proveedor:</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="">(Sin proveedor específico)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nº Comprobante / Guía (opcional):</label>
                  <input
                    type="text"
                    placeholder="Ej. Factura F001-492"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              {/* Buscador de prendas para agregar */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-white block">Añadir Prendas a la Compra:</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por SKU o nombre de prenda..."
                    value={variantSearch}
                    onChange={(e) => handleSearchVariants(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
                </div>

                {variantResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {variantResults.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => addItemToPurchase(v)}
                        className="w-full p-2 text-left hover:bg-slate-800 flex items-center justify-between text-xs transition"
                      >
                        <div>
                          <span className="font-mono font-bold text-cyan-300">{v.sku}</span> &bull; <b>{v.product_name}</b> ({v.size} - {v.color})
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold">+ Agregar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabla de ítems a comprar */}
              <div className="space-y-2">
                <span className="font-bold text-slate-300 block">Detalle de Prendas ({purchaseItems.length}):</span>
                {purchaseItems.length === 0 ? (
                  <p className="text-slate-500 py-3 text-center">Busca y añade prendas en el campo superior.</p>
                ) : (
                  <div className="space-y-1.5">
                    {purchaseItems.map((item) => (
                      <div key={item.variantId} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-cyan-300 font-bold">{item.sku}</span>
                          <h5 className="font-bold text-white truncate">{item.productName} ({item.size} - {item.color})</h5>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block">Cantidad:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(item.variantId, parseInt(e.target.value, 10))}
                              className="w-16 bg-slate-900 border border-slate-800 rounded p-1 text-center font-bold text-white"
                            />
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block">Costo Unit. S/:</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) => updateItemCost(item.variantId, parseFloat(e.target.value) || 0)}
                              className="w-20 bg-slate-900 border border-slate-800 rounded p-1 text-right text-white"
                            />
                          </div>

                          <div className="text-right min-w-[60px]">
                            <span className="text-[9px] text-slate-400 block">Subtotal:</span>
                            <span className="font-black text-white">S/ {(item.quantity * item.unitCost).toFixed(2)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.variantId)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block">Costo Total Compra:</span>
                  <span className="text-xl font-black text-white">S/ {totalPurchaseCost.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || purchaseItems.length === 0}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-950/40"
                  >
                    {isSubmitting ? 'Registrando...' : 'Confirmar Recepción (+ Stock)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
