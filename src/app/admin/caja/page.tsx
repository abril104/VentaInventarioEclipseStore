'use client';

import React, { useState, useEffect } from 'react';
import { CashSession, CashMovement, UserProfile } from '@/types';
import {
  Wallet,
  PlusCircle,
  MinusCircle,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export default function CashSessionPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Apertura
  const [initialCashInput, setInitialCashInput] = useState('');
  const [openNotes, setOpenNotes] = useState('');

  // Movimiento manual (Gasto, retiro, ingreso)
  const [movType, setMovType] = useState<'gasto' | 'retiro' | 'ingreso_extra' | 'deposito'>('gasto');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movRef, setMovRef] = useState('');
  const [isSubmittingMov, setIsSubmittingMov] = useState(false);

  // Cierre de caja
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [closureResult, setClosureResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/auth/switch'),
        fetch('/api/cash/session'),
      ]);
      const uData = await uRes.json();
      const sData = await sRes.json();

      setCurrentUser(uData.user);
      setActiveSession(sData.activeSession);
      setSummary(sData.summary);
      setMovements(sData.movements || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch('/api/cash/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opened_by: currentUser.id,
          initial_cash: parseFloat(initialCashInput) || 0,
          notes: openNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !currentUser) return;

    setIsSubmittingMov(true);
    try {
      const res = await fetch('/api/cash/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          type: movType,
          amount: parseFloat(movAmount),
          reason: movReason,
          reference: movRef,
          registered_by: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMovAmount('');
      setMovReason('');
      setMovRef('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingMov(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !currentUser) return;

    if (!confirm('¿Estás seguro de cerrar la caja principal? Esta acción es definitiva e inmutable.')) {
      return;
    }

    setIsClosing(true);
    try {
      const res = await fetch('/api/cash/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          closed_by: currentUser.id,
          counted_cash: parseFloat(countedCashInput) || 0,
          notes: closureNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClosureResult(data.closure);
      setActiveSession(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // SI NO HAY CAJA ABIERTA: FORMULARIO DE APERTURA
  if (!activeSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {closureResult && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Cierre de Caja Anterior Registrado Correctamente</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-slate-200">
              <div>Efectivo Esperado: S/ {closureResult.expected_cash.toFixed(2)}</div>
              <div>Efectivo Contado: S/ {closureResult.counted_cash.toFixed(2)}</div>
              <div className={closureResult.difference >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                Diferencia: S/ {closureResult.difference.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
              <Unlock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                Apertura de Caja Principal Compartida
              </h2>
              <p className="text-slate-400 text-xs">
                Inicia la jornada comercial registrando el efectivo inicial en soles (PEN) contado físicamente en la gaveta.
              </p>
            </div>
          </div>

          <form onSubmit={handleOpenSession} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Responsable de la Apertura:
              </label>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-400 font-bold flex items-center justify-between">
                <span>{currentUser?.full_name}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-cyan-950 rounded">
                  {currentUser?.role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Saldo Inicial de Efectivo en Gaveta (S/):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">S/</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  placeholder="0.00"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Ingresa el monto exacto en monedas y billetes disponible al iniciar el turno.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Observaciones iniciales (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. Fondo para cambio - billetes de 10 y 20 y monedas"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-600 via-indigo-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-950/40 transition"
            >
              Confirmar Apertura de Caja Principal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // CAJA ABIERTA: MONITOREO EN VIVO, MOVIMIENTOS Y CIERRE
  const countedNum = parseFloat(countedCashInput) || 0;
  const currentDifference = countedCashInput ? countedNum - (summary?.expectedCash || 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header y Resumen de Sesión Activa */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Caja Principal: {activeSession.session_code}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-bold uppercase">
                  Turno Abierto
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Abierta por <b>{activeSession.opened_by_name}</b> el {new Date(activeSession.opened_at).toLocaleString('es-PE')}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas de Saldos en Vivo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Fondo Inicial
            </span>
            <span className="text-xl font-black text-white">
              S/ {(summary?.initialCash || 0).toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Ventas en Efectivo
            </span>
            <span className="text-xl font-black text-emerald-400">
              + S/ {(summary?.cashSales || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {summary?.totalSalesCount || 0} ventas totales
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Gastos / Retiros
            </span>
            <span className="text-xl font-black text-red-400">
              - S/ {(summary?.cashOutflow || 0).toFixed(2)}
            </span>
          </div>

          <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-2xl p-4">
            <span className="text-[10px] text-cyan-300 uppercase font-bold block mb-1">
              Efectivo Físico Esperado
            </span>
            <span className="text-2xl font-black text-cyan-400">
              S/ {(summary?.expectedCash || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              (Inicial + Ventas - Salidas)
            </span>
          </div>
        </div>

        {/* Saldos Digitales (NO incrementan efectivo físico) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Cobros Registrados por Medios Digitales (En Cuentas Bancarias / Billeteras):</span>
            <span className="text-[10px] text-slate-400">No sumar al efectivo físico</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Yape:</span>
              <span className="font-bold text-purple-400 text-sm">
                S/ {(summary?.digitalTotals?.yape || 0).toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Plin:</span>
              <span className="font-bold text-sky-400 text-sm">
                S/ {(summary?.digitalTotals?.plin || 0).toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Tarjeta:</span>
              <span className="font-bold text-amber-400 text-sm">
                S/ {(summary?.digitalTotals?.tarjeta || 0).toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Transferencia:</span>
              <span className="font-bold text-teal-400 text-sm">
                S/ {(summary?.digitalTotals?.transferencia || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Movimientos Manuales (Gastos/Retiros/Ingresos) | Cierre de Caja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registrar Movimiento Manual */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span>Registrar Movimiento de Caja</span>
          </h3>

          <form onSubmit={handleAddMovement} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tipo de Movimiento:
                </label>
                <select
                  value={movType}
                  onChange={(e: any) => setMovType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="gasto">Gasto Operativo (Salida)</option>
                  <option value="retiro">Retiro de Efectivo (Salida)</option>
                  <option value="ingreso_extra">Ingreso Extraordinario (Entrada)</option>
                  <option value="deposito">Depósito / Aporte (Entrada)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Importe (S/):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  required
                  placeholder="0.00"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Motivo / Justificación obligatoria:
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Compra de cinta de embalaje y bolsas para el stand"
                value={movReason}
                onChange={(e) => setMovReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Nº de Comprobante / Referencia (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. Recibo 0021"
                value={movRef}
                onChange={(e) => setMovRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingMov}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition"
            >
              {isSubmittingMov ? 'Registrando...' : 'Guardar Movimiento de Caja'}
            </button>
          </form>

          {/* Historial de Movimientos de la Sesión */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">
              Movimientos Registrados en el Turno ({movements.length}):
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {movements.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No hay movimientos manuales registrados.</p>
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white capitalize block">{m.type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">{m.reason} ({m.registered_by_name})</span>
                    </div>
                    <span className={`font-mono font-bold ${['gasto', 'retiro'].includes(m.type) ? 'text-red-400' : 'text-emerald-400'}`}>
                      {['gasto', 'retiro'].includes(m.type) ? '-' : '+'} S/ {m.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Formulario de Cierre de Caja y Liquidación */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-wider">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Cierre de Caja y Arqueo Físico</span>
          </div>

          <form onSubmit={handleCloseSession} className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Efectivo Físico Esperado:</span>
                <span className="font-bold text-white">S/ {(summary?.expectedCash || 0).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Efectivo Físico Contado en Gaveta (S/):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">S/</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  placeholder="0.00"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-black focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {countedCashInput && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  Math.abs(currentDifference) < 0.01
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : currentDifference > 0
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : 'bg-red-950/60 border-red-500/50 text-red-300'
                }`}
              >
                <span>Diferencia de Caja:</span>
                <span className="text-sm font-black">
                  {currentDifference > 0 ? `+ S/ ${currentDifference.toFixed(2)} (Sobrante)` : currentDifference < 0 ? `- S/ ${Math.abs(currentDifference).toFixed(2)} (Faltante)` : 'S/ 0.00 (Cuadre Exacto)'}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Observaciones del Cierre (obligatorio si hay diferencia):
              </label>
              <textarea
                rows={2}
                placeholder="Explicación o notas del conteo de efectivo al finalizar la jornada..."
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isClosing || !countedCashInput}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-950/40 transition"
            >
              {isClosing ? 'Cerrando y Liquidando Caja...' : 'Confirmar Cierre Definitivo de Caja'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
