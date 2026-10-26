'use client';

import React, { useState, useEffect } from 'react';
import { ExcelImportReport, ExcelRowParsed } from '@/lib/excel/importer';
import { UserProfile } from '@/types';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function ImportExcelPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [report, setReport] = useState<ExcelImportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch('/api/auth/switch'),
        fetch('/api/excel/preview'),
      ]);
      const uData = await uRes.json();
      const pData = await pRes.json();

      setCurrentUser(uData.user);
      setReport(pData.report || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!report || !currentUser) return;

    const validRows = report.rows.filter((r) => r.canImport);
    if (validRows.length === 0) {
      alert('No hay filas válidas para importar.');
      return;
    }

    if (!confirm(`¿Confirmas importar ${validRows.length} registros del Excel al inventario real?`)) {
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/excel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows,
          registered_by: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setImportResult(data);
      alert(`¡Importación exitosa! Se cargaron ${data.importedCount} variantes al inventario.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-600/50 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Importador y Validador del Excel de Inventario
            </h2>
            <p className="text-slate-400 text-xs">
              Inspección de <b className="text-cyan-400">INVENTARIO2311AM.xlsx</b> con detección de variantes, tallas, colores agrupados y control de SKU.
            </p>
          </div>
        </div>

        {report && (
          <button
            onClick={handleConfirmImport}
            disabled={importing || report.validRowsCount + report.warningRowsCount === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center gap-2"
          >
            {importing ? (
              <span>Importando al Sistema...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar Importación ({report.validRowsCount + report.warningRowsCount} Registros)</span>
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Inspeccionando archivo Excel y validando integridad...</p>
        </div>
      ) : !report ? (
        <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          No se encontró el archivo de inventario o no pudo ser leído.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Métricas del Reporte */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Filas Leídas</span>
              <span className="text-2xl font-black text-white">{report.totalRows}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Hoja: {report.sheetUsed}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Filas 100% Listas</span>
              <span className="text-2xl font-black text-emerald-400">{report.validRowsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Sin advertencias</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1">Con Advertencias</span>
              <span className="text-2xl font-black text-amber-400">{report.warningRowsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Precios 0 o colores agrupados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-red-400 uppercase font-bold block mb-1">Con Errores Bloqueantes</span>
              <span className="text-2xl font-black text-red-400">{report.errorRowsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">SKU duplicado u omitido</span>
            </div>
          </div>

          {importResult && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <b>¡Importación Completada!</b> Se agregaron exitosamente {importResult.importedCount} registros al inventario y se registraron en Kardex.
              </div>
              <a href="/admin/inventario" className="font-bold underline text-white">
                Ver Inventario &rarr;
              </a>
            </div>
          )}

          {/* Tabla de Previsualización y Diagnóstico */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Vista Previa Fila por Fila ({report.rows.length})</span>
              <span className="text-[10px] text-slate-400">Precios en soles peruanos (PEN)</span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Fila</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Público</th>
                    <th className="py-2.5 px-3">Prenda</th>
                    <th className="py-2.5 px-3">Talla</th>
                    <th className="py-2.5 px-3">Color</th>
                    <th className="py-2.5 px-3 text-center">Cant</th>
                    <th className="py-2.5 px-3 text-right">Precio S/</th>
                    <th className="py-2.5 px-3">Proveedor</th>
                    <th className="py-2.5 px-3">Diagnóstico / Revisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.rows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={`hover:bg-slate-800/40 transition ${
                        r.hasErrors ? 'bg-red-950/20' : r.hasWarnings ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{r.rowNumber}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded text-[10.5px]">
                          {r.sku}
                        </span>
                      </td>
                      <td className="py-2 px-3 capitalize text-slate-300">{r.gender}</td>
                      <td className="py-2 px-3 font-bold text-white">{r.productName}</td>
                      <td className="py-2 px-3 text-slate-300">{r.size}</td>
                      <td className="py-2 px-3 text-slate-300">{r.color}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-200">
                        {r.quantity !== null ? r.quantity : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-cyan-400">
                        {r.price !== null ? `S/ ${r.price.toFixed(2)}` : 'Vacío'}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{r.supplier || '-'}</td>
                      <td className="py-2 px-3">
                        {r.statusNotes.length === 0 ? (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correcto
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {r.statusNotes.map((note, idx) => (
                              <span
                                key={idx}
                                className={`block text-[10px] ${
                                  r.hasErrors ? 'text-red-400 font-bold' : 'text-amber-400'
                                }`}
                              >
                                &bull; {note}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
