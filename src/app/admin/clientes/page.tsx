'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Sale } from '@/types';
import {
  Users,
  Search,
  Download,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Receipt,
  Phone,
  Mail,
  Building2,
  User,
  ShoppingBag,
  Calendar,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Historial
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<{ customer: Customer; sales: Sale[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal Nuevo / Editar Cliente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({
    doc_type: 'DNI',
    doc_number: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (search?: string) => {
    setLoading(true);
    try {
      const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchCustomers(val);
  };

  const handleOpenHistory = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (res.ok) {
        setCustomerHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenNew = () => {
    setEditingCustomer({
      doc_type: 'DNI',
      doc_number: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer({
      id: c.id,
      doc_type: c.doc_type,
      doc_number: c.doc_number,
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer.doc_number || !editingCustomer.name || !editingCustomer.phone) {
      setFormError('El documento, nombre y teléfono son obligatorios.');
      return;
    }

    setSavingCustomer(true);
    setFormError(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      setIsEditModalOpen(false);
      fetchCustomers(searchQuery);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al cliente "${name}" del directorio?`)) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers(searchQuery);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // KPIs
  const totalSpentAll = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const empresasCount = customers.filter((c) => c.doc_type === 'RUC').length;
  const personasCount = customers.length - empresasCount;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
            <Users className="w-4 h-4 text-amber-500" />
            <span>Módulo Comercial</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">
            Directorio de Clientes & Empresas
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Registro con historial de compras, DNI/RUC para boleta o factura y fidelización.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/excel/export?type=customers"
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider rounded-xl border border-neutral-300 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </a>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Clientes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Clientes</span>
            <Users className="w-4 h-4 text-neutral-700" />
          </div>
          <p className="text-2xl font-black text-black">{customers.length}</p>
          <span className="text-[10px] text-neutral-400 font-medium">Registrados en el sistema</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Personas (DNI)</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-black">{personasCount}</p>
          <span className="text-[10px] text-neutral-400 font-medium">Boletas de venta</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Empresas (RUC)</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-black">{empresasCount}</p>
          <span className="text-[10px] text-neutral-400 font-medium">Facturas emitidas</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas Acumuladas</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">S/ {totalSpentAll.toFixed(2)}</p>
          <span className="text-[10px] text-neutral-400 font-medium">En compras completadas</span>
        </div>
      </div>

      {/* Buscador & Tabla de Clientes */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, RUC, teléfono o correo..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-black placeholder-neutral-400 focus:outline-none focus:border-black transition"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <span className="text-xs font-bold text-neutral-500">
            Mostrando {customers.length} cliente{customers.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-neutral-500 space-y-2">
            <div className="w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider">Cargando directorio de clientes...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-neutral-300" />
            <p className="text-sm font-bold text-neutral-700">No se encontraron clientes.</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Los clientes se registran automáticamente en cada venta del Punto de Venta (POS) o puedes añadir uno manualmente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-100 text-neutral-800 uppercase font-black tracking-wider text-[10px] border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Cliente / Razón Social</th>
                  <th className="py-3 px-4">Contacto (Teléfono & Correo)</th>
                  <th className="py-3 px-4">Dirección Fiscal</th>
                  <th className="py-3 px-4 text-center">Compras</th>
                  <th className="py-3 px-4 text-right">Total Acumulado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            c.doc_type === 'RUC'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          {c.doc_type}
                        </span>
                        <span className="font-mono font-bold text-black">{c.doc_number}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-neutral-900">{c.name}</p>
                      {c.last_purchase_at && (
                        <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Última compra: {new Date(c.last_purchase_at).toLocaleDateString('es-PE')}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-neutral-900">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          <span>{c.phone || '-'}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                            <Mail className="w-3 h-3 text-neutral-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-neutral-500 text-[11px] max-w-[180px] truncate block">
                        {c.address || '-'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 font-bold text-xs">
                        {c.orders_count || 0}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-black">
                        S/ {Number(c.total_spent || 0).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(c.id)}
                          className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition"
                          title="Ver Historial de Compras"
                        >
                          <Receipt className="w-4 h-4 text-amber-600" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition"
                          title="Editar Datos"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id, c.name)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: HISTORIAL DE COMPRAS DEL CLIENTE */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-black flex items-center justify-center font-black">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Historial de Compras</h3>
                  <p className="text-[11px] text-neutral-300">
                    {customerHistory?.customer.name} ({customerHistory?.customer.doc_type}: {customerHistory?.customer.doc_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerHistory(null);
                }}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center text-neutral-500">
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">Cargando compras...</p>
                </div>
              ) : !customerHistory || customerHistory.sales.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="text-xs font-bold text-neutral-600">Este cliente aún no tiene ventas asociadas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    <div>
                      <span className="text-neutral-500 font-bold block">Teléfono:</span>
                      <span className="font-bold text-black">{customerHistory.customer.phone || 'No registrado'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">Total Comprado:</span>
                      <span className="font-black text-emerald-700 text-sm">
                        S/ {customerHistory.customer.total_spent.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">Nº de Órdenes:</span>
                      <span className="font-bold text-black">{customerHistory.sales.length}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">
                      Detalle de Comprobantes Emitidos:
                    </h4>

                    {customerHistory.sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="border border-neutral-200 rounded-xl p-3 bg-white space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-black bg-neutral-100 px-2 py-0.5 rounded">
                              {sale.receipt_number}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-neutral-500">
                              {sale.receipt_type || 'Boleta'} &bull; {new Date(sale.created_at).toLocaleString('es-PE')}
                            </span>
                          </div>
                          <span className="font-black text-black text-sm">
                            S/ {sale.total.toFixed(2)}
                          </span>
                        </div>

                        {/* Items de la venta */}
                        <div className="space-y-1 pl-1">
                          {(sale.items || []).map((it, idx) => (
                            <div key={idx} className="flex justify-between text-[11px] text-neutral-600">
                              <span>
                                {it.quantity} x {it.product_name_snapshot} ({it.size_snapshot} / {it.color_snapshot})
                              </span>
                              <span className="font-bold text-neutral-800">S/ {it.subtotal.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-100">
                          <span>Vendedor: {sale.seller_name || 'Stand'}</span>
                          <span>
                            Op. Gravada: S/ {(sale.tax_base ?? (sale.total / 1.18)).toFixed(2)} | IGV: S/ {(sale.tax_amount ?? (sale.total - (sale.total / 1.18))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-right">
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerHistory(null);
                }}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs uppercase rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR CLIENTE O EMPRESA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-black text-white flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider">
                {editingCustomer.id ? 'Editar Datos del Cliente / Empresa' : 'Nuevo Cliente / Empresa'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Tipo de Doc.:
                  </label>
                  <select
                    value={editingCustomer.doc_type}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, doc_type: e.target.value as any })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                  >
                    <option value="DNI">DNI (Persona)</option>
                    <option value="RUC">RUC (Empresa)</option>
                    <option value="CE">Carnet Ext.</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div className="col-span-7">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Nº de Documento*:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={editingCustomer.doc_type === 'RUC' ? '20XXXXXXXXX' : '71234567'}
                    value={editingCustomer.doc_number}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, doc_number: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Nombre Completo / Razón Social*:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza o Inversiones S.A.C."
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Teléfono Celular*:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="987654321"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Correo Electrónico:
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Dirección Fiscal / Domicilio (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Jr. Gamarra 1234, La Victoria"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Observaciones / Notas:
                </label>
                <textarea
                  rows={2}
                  placeholder="Preferencias de prendas, canal de contacto habitual, etc."
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {savingCustomer ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
