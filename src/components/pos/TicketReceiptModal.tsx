'use client';

import React, { useState, useEffect } from 'react';
import { Sale } from '@/types';
import { Printer, CheckCircle, X, ShieldAlert } from 'lucide-react';

interface TicketReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export function TicketReceiptModal({ sale, onClose }: TicketReceiptModalProps) {
  const [standAddress, setStandAddress] = useState('Stand Comercial - Lima, Perú');
  const [storePhone, setStorePhone] = useState('+51 961 339 776');
  const [storeEmail, setStoreEmail] = useState('contacto@eclipsestore.pe');
  const [storeRuc, setStoreRuc] = useState('20608912345');
  const [ticketFooterPhrase, setTicketFooterPhrase] = useState(
    '¡Gracias por tu preferencia! Cambios válidos dentro de los 7 días con etiqueta intacta y comprobante.'
  );

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
          if (data.settings.address) setStandAddress(data.settings.address);
          if (data.settings.store_phone) setStorePhone(data.settings.store_phone);
          if (data.settings.store_email) setStoreEmail(data.settings.store_email);
          if (data.settings.store_ruc) setStoreRuc(data.settings.store_ruc);
          if (data.settings.ticket_footer_phrase) setTicketFooterPhrase(data.settings.ticket_footer_phrase);
        }
      } catch (e) {
        // fallback
      }
    }
    fetchSettings();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const receiptTitle =
    sale.receipt_type === 'factura'
      ? 'FACTURA ELECTRÓNICA'
      : sale.receipt_type === 'boleta'
      ? 'BOLETA DE VENTA ELECTRÓNICA'
      : 'TICKET DE VENTA';

  const taxBase = sale.tax_base ?? Number((sale.total / 1.18).toFixed(2));
  const taxAmount = sale.tax_amount ?? Number((sale.total - taxBase).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header modal */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm uppercase tracking-wider">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>¡Venta Confirmada con Éxito!</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-black rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket imprimible */}
        <div id="printable-ticket" className="p-6 overflow-y-auto bg-white text-black font-mono text-xs space-y-4">
          <div className="text-center space-y-1.5 border-b border-dashed border-gray-400 pb-3">
            {/* Logo de la tienda */}
            <div className="flex justify-center pb-1">
              <img
                src="/logo.png"
                alt="ECLISSI STORE"
                className="h-14 w-auto object-contain mx-auto"
              />
            </div>
            <h2 className="text-base font-black tracking-wider uppercase">ECLISSI STORE</h2>
            <p className="text-[11px] font-sans text-gray-700 font-semibold">RUC: {storeRuc}</p>
            <p className="text-[10px] text-gray-600 font-bold">{standAddress}</p>
            <p className="text-[10px] text-gray-600">Tel: {storePhone}</p>
            {storeEmail && <p className="text-[10px] text-gray-600">Email: {storeEmail}</p>}

            <div className="pt-2 text-[12px] font-black tracking-wider text-black border-t border-dashed border-gray-300">
              {receiptTitle}
            </div>
            <div className="text-[13px] font-black text-black">
              Nº {sale.receipt_number}
            </div>
          </div>

          {/* Metadatos de la venta y datos del cliente / empresa */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha y Hora:</span>
              <span>{new Date(sale.created_at).toLocaleString('es-PE')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vendedor:</span>
              <span className="font-bold">{sale.seller_name || 'Personal en turno'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Canal:</span>
              <span className="uppercase">{sale.channel === 'pos' ? 'Presencial (Stand)' : 'WhatsApp'}</span>
            </div>

            {/* Datos del Cliente / Empresa */}
            {sale.customer_doc_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {sale.customer_doc_type || (sale.receipt_type === 'factura' ? 'RUC' : 'DNI')}:
                </span>
                <span className="font-bold">{sale.customer_doc_number}</span>
              </div>
            )}
            {sale.customer_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {sale.receipt_type === 'factura' ? 'Razón Social:' : 'Cliente:'}
                </span>
                <span className="font-bold text-right max-w-[200px] truncate">{sale.customer_name}</span>
              </div>
            )}
            {sale.customer_phone && (
              <div className="flex justify-between">
                <span className="text-gray-600">Teléfono:</span>
                <span>{sale.customer_phone}</span>
              </div>
            )}
            {sale.customer_email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Correo:</span>
                <span className="text-right max-w-[200px] truncate">{sale.customer_email}</span>
              </div>
            )}
            {sale.customer_address && (
              <div className="flex justify-between">
                <span className="text-gray-600">Dirección:</span>
                <span className="text-right max-w-[200px] truncate">{sale.customer_address}</span>
              </div>
            )}
          </div>

          {/* Tabla de Artículos */}
          <div className="space-y-2 border-b border-dashed border-gray-400 pb-3">
            <div className="flex justify-between font-bold text-[10px] uppercase text-gray-500">
              <span>Cant. / Descripción</span>
              <span>Subtotal</span>
            </div>
            {(sale.items || []).map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{item.quantity} x {item.product_name_snapshot}</span>
                  <span>S/ {item.subtotal.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1.5 pl-2">
                  <span>SKU: {item.sku_snapshot}</span>
                  <span>&bull;</span>
                  <span>Talla: {item.size_snapshot}</span>
                  <span>&bull;</span>
                  <span>Color: {item.color_snapshot}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totales y Desglose Tributario de IGV (18%) */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-600">Op. Gravada (Valor Venta):</span>
              <span>S/ {taxBase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">I.G.V. (18%):</span>
              <span>S/ {taxAmount.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Descuento aplicado:</span>
                <span>- S/ {sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black border-t border-dashed border-gray-400 pt-1.5">
              <span>TOTAL A PAGAR:</span>
              <span>S/ {sale.total.toFixed(2)}</span>
            </div>

            <div className="pt-2 text-[10px] text-gray-600">
              <span className="font-bold block text-black">Medio de Pago:</span>
              {(sale.payments || []).map((p, i) => (
                <div key={i} className="flex justify-between capitalize">
                  <span>&bull; {p.payment_method}</span>
                  <span>S/ {p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Frase Administrable de Pie de Ticket */}
          <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-600 space-y-1">
            <p className="font-medium italic leading-relaxed">{ticketFooterPhrase}</p>
            <p className="text-[9px] font-sans text-gray-400 pt-1">Eclipse Store &bull; Sistema POS</p>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm transition flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir {receiptTitle}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 font-bold text-xs uppercase rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
