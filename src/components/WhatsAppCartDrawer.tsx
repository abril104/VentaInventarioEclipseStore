'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { X, Trash2, Plus, Minus, Send, ShoppingBag, AlertCircle, Copy, Check } from 'lucide-react';

interface WhatsAppCartDrawerProps {
  whatsappNumber?: string;
  storeName?: string;
}

export function WhatsAppCartDrawer({
  whatsappNumber: propWhatsappNumber,
  storeName = 'Eclissi Store',
}: WhatsAppCartDrawerProps) {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeWhatsappNumber, setActiveWhatsappNumber] = useState(propWhatsappNumber || '');

  // Cargar número de WhatsApp dinámico desde la configuración de la tienda
  useEffect(() => {
    async function fetchLiveWhatsapp() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings?.whatsapp_number) {
          setActiveWhatsappNumber(data.settings.whatsapp_number);
        }
      } catch (e) {
        // fallback
      }
    }
    if (isOpen) {
      fetchLiveWhatsapp();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const buildOrderSummaryText = () => {
    let message = `¡Hola *${storeName}*! 👋 Deseo realizar una consulta / pedido desde el catálogo web:\n\n`;
    if (customerName.trim()) {
      message += `👤 *Cliente:* ${customerName.trim()}\n\n`;
    }

    message += `📋 *Detalle del Pedido:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. *${item.productName}*\n`;
      message += `   - SKU: \`${item.sku}\`\n`;
      message += `   - Talla: ${item.size} | Color: ${item.color}\n`;
      message += `   - Cantidad: ${item.quantity} x ${item.price > 0 ? `S/ ${item.price.toFixed(2)}` : 'Precio a consultar'}\n`;
      message += `   - Subtotal: *${item.price > 0 ? `S/ ${(item.quantity * item.price).toFixed(2)}` : 'A consultar'}*\n\n`;
    });

    message += `💰 *TOTAL ESTIMADO:* ${totalPrice > 0 ? `S/ ${totalPrice.toFixed(2)}` : 'A consultar en stand'}\n`;

    if (notes.trim()) {
      message += `📝 *Nota adicional:* ${notes.trim()}\n`;
    }

    message += `\n📍 *Canal:* Catálogo Web Eclissi Store (Perú - Soles PEN)\n`;
    message += `_Por favor confírmenme disponibilidad para concretar la compra._`;
    return message;
  };

  const handleSendWhatsApp = () => {
    if (items.length === 0) return;

    const cleanPhone = (activeWhatsappNumber || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert(
        'El número de WhatsApp de la tienda aún no ha sido ingresado en el panel administrativo (/admin/configuracion). Puedes copiar el resumen de tu pedido con el botón "Copiar Pedido" o consultar directamente en el stand.'
      );
      return;
    }

    setIsSending(true);
    const message = buildOrderSummaryText();
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
    setIsSending(false);
  };

  const handleCopyOrder = () => {
    const text = buildOrderSummaryText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasConfiguredWhatsapp = Boolean((activeWhatsappNumber || '').replace(/[^0-9]/g, ''));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-neutral-200 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-black" />
              <h2 className="text-sm font-extrabold text-neutral-900 tracking-wider uppercase">
                Mi Pedido ({totalItems})
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner informativo de integridad y estado del WhatsApp */}
          {!hasConfiguredWhatsapp ? (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold block">WhatsApp comercial por configurar:</span>
                <span>
                  El número se define en el panel administrativo. Mientras tanto puedes copiar el
                  detalle de tu pedido para compartirlo.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-100 border-b border-neutral-200 px-4 py-2 flex items-center gap-2 text-xs text-neutral-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>
                Enviar el mensaje no descuenta inventario hasta confirmarse la venta en tienda.
              </span>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-neutral-300 stroke-1" />
                <p className="font-bold text-neutral-800 text-sm">Tu lista de pedido está vacía</p>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Explora las prendas del catálogo y agrega las tallas y colores que desees coordinar
                  para tu compra.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.variantId}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex gap-3 items-center group hover:border-neutral-400 transition"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-neutral-900 text-xs sm:text-sm truncate">
                      {item.productName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-600">
                      <span className="bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {item.sku}
                      </span>
                      <span>
                        Talla: <b className="text-neutral-900">{item.size}</b>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Color: <b className="text-neutral-900">{item.color}</b>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-black font-extrabold text-xs sm:text-sm">
                        {item.price > 0 ? `S/ ${item.price.toFixed(2)}` : 'Precio a consultar'}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Stock: {item.maxStock} disp.
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="p-1 hover:bg-neutral-100 rounded text-neutral-600 hover:text-black transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-black text-xs text-neutral-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="p-1 hover:bg-neutral-100 rounded text-neutral-600 hover:text-black disabled:opacity-30 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 transition"
                    title="Quitar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer del Carrito con Resumen y Enviar a WhatsApp */}
          {items.length > 0 && (
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 space-y-3">
              {/* Formulario opcional para el cliente */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tu nombre (opcional)..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Nota (ej. consultar envío a provincia)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Total Estimado:
                </span>
                <span className="text-base font-black text-black">
                  {totalPrice > 0 ? `S/ ${totalPrice.toFixed(2)}` : 'A consultar'}
                </span>
              </div>

              {/* Acciones */}
              <div className="space-y-2">
                <button
                  onClick={handleSendWhatsApp}
                  disabled={isSending}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Pedido por WhatsApp</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyOrder}
                    className="flex-1 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Pedido</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearCart}
                    className="px-3 py-2 bg-white hover:bg-red-50 hover:text-red-600 border border-neutral-200 text-neutral-500 font-bold text-xs rounded-lg transition"
                    title="Vaciar lista"
                  >
                    Vaciar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
