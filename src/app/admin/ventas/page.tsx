'use client';

import React, { useState, useEffect } from 'react';
import { Sale, UserProfile } from '@/types';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Filter,
  Download,
  CheckCircle,
  Calendar,
  Users,
  Ban,
  AlertTriangle,
  X,
} from 'lucide-react';
import { TicketReceiptModal } from '@/components/pos/TicketReceiptModal';

export default function SalesHistoryPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [sellerFilter, setSellerFilter] = useState('todos');
  const [channelFilter, setChannelFilter] = useState('todos');

  // Modal Anulación Auditada
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/auth/switch'),
        fetch('/api/sales/list'),
      ]);
      const uData = await uRes.json();
      const sData = await sRes.json();

      setCurrentUser(uData.user);
      setSales(sData.sales || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (saleId: string) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`);
      const data = await res.json();
      setSelectedSale(data.sale);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSale || !currentUser) return;

    if (!cancelReason.trim()) {
      alert('El motivo de anulación es obligatorio.');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/sales/${cancellingSale.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelled_by: currentUser.full_name,
          reason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('¡Venta anulada con éxito! Las prendas fueron devueltas al inventario con registro en Kardex.');
      setCancellingSale(null);
      setCancelReason('');
      loadSales();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (sellerFilter !== 'todos' && s.seller_id !== sellerFilter) return false;
    if (channelFilter !== 'todos' && s.channel !== channelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {selectedSale && (
        <TicketReceiptModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Historial de Ventas & Comprobantes
            </h2>
            <p className="text-slate-400 text-xs">
              Registro histórico inmutable de ventas presenciales y WhatsApp con reimpresión de comprobante y anulación auditada.
            </p>
          </div>
        </div>

        <a
          href="/api/excel/export?type=sales"
          download
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Ventas a Excel</span>
        </a>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">Filtrar por Canal:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
          >
            <option value="todos">Todos los Canales</option>
            <option value="pos">Presencial (POS Stand)</option>
            <option value="whatsapp">WhatsApp Web</option>
          </select>
        </div>

        <span className="text-slate-400">
          Mostrando <b>{filteredSales.length}</b> operaciones
        </span>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nº Comprobante</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Subtotal S/</th>
                <th className="py-3 px-4 text-right">Desc. S/</th>
                <th className="py-3 px-4 text-right">Total S/</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No se encontraron operaciones registradas.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-800/40 transition ${s.status === 'cancelled' ? 'opacity-50 bg-red-950/10' : ''}`}>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {s.receipt_number}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(s.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {s.seller_name || 'Personal'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {s.channel === 'pos' ? 'Stand POS' : 'WhatsApp'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          s.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-950 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {s.status === 'completed' ? 'Completada' : 'Anulada'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      S/ {s.subtotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {s.discount > 0 ? `- S/ ${s.discount.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-3 px-4 text-right font-black text-sm ${s.status === 'cancelled' ? 'line-through text-slate-500' : 'text-emerald-400'}`}>
                      S/ {s.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenTicket(s.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold flex items-center justify-center gap-1 transition"
                          title="Reimprimir o ver ticket"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ticket</span>
                        </button>

                        {s.status === 'completed' && (
                          <button
                            onClick={() => setCancellingSale(s)}
                            className="p-1 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition"
                            title="Anular venta y revertir inventario"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Anulación Auditada */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Anulación Auditada de Venta</span>
              </div>
              <button
                onClick={() => setCancellingSale(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <p><b>Comprobante:</b> {cancellingSale.receipt_number}</p>
              <p><b>Total de la Venta:</b> S/ {cancellingSale.total.toFixed(2)}</p>
              <p><b>Fecha:</b> {new Date(cancellingSale.created_at).toLocaleString('es-PE')}</p>
              <p className="text-amber-300 pt-1 text-[11px]">
                * Esta operación restaurará automáticamente las unidades de cada prenda al inventario físico y registrará un movimiento de reversión en Kardex.
              </p>
            </div>

            <form onSubmit={handleExecuteCancel} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Motivo obligatorio de anulación:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. Error de digitación / Devolución inmediata de prendas por el cliente..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingSale(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !cancelReason.trim()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-950/40"
                >
                  {isSubmittingCancel ? 'Anulando...' : 'Confirmar Anulación & Revertir Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
