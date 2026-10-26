'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProductVariant, CashSession, UserProfile, PaymentMethod, Sale, ReceiptType, DocumentType } from '@/types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Wallet,
  CreditCard,
  Smartphone,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  FileText,
  Building2,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react';
import { TicketReceiptModal } from '@/components/pos/TicketReceiptModal';

interface PosCartItem {
  variantId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
  discount: number;
  subtotal: number;
  primaryImage?: string;
}

export default function PosPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal apertura de caja si está cerrada
  const [initialCashInput, setInitialCashInput] = useState('0');
  const [openNotesInput, setOpenNotesInput] = useState('');
  const [openingSession, setOpeningSession] = useState(false);

  // Búsqueda y catálogo rápido
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carrito de venta
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [saleChannel, setSaleChannel] = useState<'pos' | 'whatsapp'>('pos');
  const [discountTotal, setDiscountTotal] = useState(0);

  // Comprobante y Cliente / Empresa
  const [receiptType, setReceiptType] = useState<ReceiptType>('boleta');
  const [customerDocType, setCustomerDocType] = useState<DocumentType>('DNI');
  const [customerDocNumber, setCustomerDocNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [foundCustomerNotice, setFoundCustomerNotice] = useState<string | null>(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [showCustomerFields, setShowCustomerFields] = useState(true);
  const [notes, setNotes] = useState('');

  const handleLookupCustomer = async (doc: string) => {
    const trimmed = doc.trim();
    if (!trimmed || trimmed.length < 8) return;
    setIsLookingUpCustomer(true);
    try {
      const res = await fetch(`/api/customers/lookup?doc=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.customer) {
        setCustomerName(data.customer.name);
        if (data.customer.phone) setCustomerPhone(data.customer.phone);
        if (data.customer.email) setCustomerEmail(data.customer.email);
        if (data.customer.address) setCustomerAddress(data.customer.address);
        setFoundCustomerNotice(`✓ Cliente registrado: ${data.customer.name}`);
      } else {
        setFoundCustomerNotice(null);
      }
    } catch {
      // ignore
    } finally {
      setIsLookingUpCustomer(false);
    }
  };

  // Medios de pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashGiven, setCashGiven] = useState('');
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [mixedPayments, setMixedPayments] = useState<{ method: PaymentMethod; amount: string; ref: string }[]>([
    { method: 'efectivo', amount: '', ref: '' },
    { method: 'yape', amount: '', ref: '' },
  ]);

  // Venta procesada y comprobante
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [userRes, sessionRes] = await Promise.all([
        fetch('/api/auth/switch'),
        fetch('/api/cash/session'),
      ]);
      const userData = await userRes.json();
      const sessionData = await sessionRes.json();

      setCurrentUser(userData.user);
      setActiveSession(sessionData.activeSession);

      // Cargar productos iniciales para búsqueda rápida
      performSearch('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/pos/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.variants || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    performSearch(q);
  };

  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpeningSession(true);
    try {
      const res = await fetch('/api/cash/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_cash: parseFloat(initialCashInput) || 0,
          notes: openNotesInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al abrir caja');
        return;
      }
      setActiveSession(data.session);
    } catch (e) {
      console.error(e);
    } finally {
      setOpeningSession(false);
    }
  };

  const addToCart = (variant: ProductVariant) => {
    if (variant.stock <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) return prev;
        return prev.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }

      const unitPrice = variant.effective_price ?? variant.price_override ?? 0;
      return [
        ...prev,
        {
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product_name || 'Prenda Deportiva',
          size: variant.size,
          color: variant.color,
          unitPrice,
          quantity: 1,
          maxStock: variant.stock,
          discount: 0,
          subtotal: unitPrice,
        },
      ];
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.variantId !== variantId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.maxStock) return item;
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.unitPrice,
          };
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  const removeItem = (variantId: string) => {
    setCartItems((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountTotal(0);
    setCashGiven('');
    setCustomerDocNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setFoundCustomerNotice(null);
    setNotes('');
    setSaleError(null);
  };

  // Cálculos de la venta con IGV (18% incluido en precios de venta)
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = Math.max(0, subtotal - discountTotal);
  const taxBase = Number((total / 1.18).toFixed(2));
  const taxAmount = Number((total - taxBase).toFixed(2));
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const changeDue = paymentMethod === 'efectivo' && cashGivenNum > total ? cashGivenNum - total : 0;

  const handleSubmitSale = async () => {
    if (!activeSession) {
      setSaleError('La caja principal debe estar abierta para registrar ventas.');
      return;
    }
    if (!currentUser) {
      setSaleError('No se ha identificado el vendedor.');
      return;
    }
    if (cartItems.length === 0) {
      setSaleError('La orden está vacía.');
      return;
    }
    if (total <= 0) {
      setSaleError('El total de la venta debe ser mayor a cero.');
      return;
    }

    if (receiptType === 'factura') {
      const ruc = customerDocNumber.trim();
      if (!ruc || ruc.length !== 11) {
        setSaleError('Para emitir Factura, el RUC debe tener exactamente 11 dígitos.');
        return;
      }
      if (!customerName.trim()) {
        setSaleError('Para emitir Factura, la Razón Social / Empresa es obligatoria.');
        return;
      }
    }

    setSaleError(null);
    setIsSubmitting(true);

    // Preparar cobros
    let paymentsPayload: { payment_method: PaymentMethod; amount: number; reference?: string }[] = [];

    if (!isMixedPayment) {
      paymentsPayload = [
        {
          payment_method: paymentMethod,
          amount: total,
          reference: paymentMethod === 'efectivo' && cashGivenNum > 0 ? `Pagó con S/ ${cashGivenNum.toFixed(2)}` : undefined,
        },
      ];
    } else {
      paymentsPayload = mixedPayments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          payment_method: p.method,
          amount: parseFloat(p.amount),
          reference: p.ref || undefined,
        }));

      const sumMixed = paymentsPayload.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(sumMixed - total) > 0.05) {
        setSaleError(`La suma de los pagos mixtos (S/ ${sumMixed.toFixed(2)}) no coincide con el total (S/ ${total.toFixed(2)}).`);
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      session_id: activeSession.id,
      seller_id: currentUser.id,
      channel: saleChannel,
      receipt_type: receiptType,
      customer_doc_type: receiptType === 'factura' ? 'RUC' : customerDocType,
      customer_doc_number: customerDocNumber.trim() || undefined,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      customer_email: customerEmail.trim() || undefined,
      customer_address: customerAddress.trim() || undefined,
      notes: notes || undefined,
      subtotal,
      discount: discountTotal,
      total,
      idempotency_key: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      items: cartItems.map((item) => ({
        variant_id: item.variantId,
        sku: item.sku,
        product_name: item.productName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: 0,
        subtotal: item.subtotal,
      })),
      payments: paymentsPayload,
    };

    try {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error registrando la venta');
      }

      setCompletedSale(data.sale);
      clearCart();
      performSearch(searchQuery);
    } catch (err: any) {
      setSaleError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-neutral-500">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-wider">Cargando Punto de Venta...</p>
        </div>
      </div>
    );
  }

  // SI LA CAJA ESTÁ CERRADA: FORMULARIO DE APERTURA ESTILO GYMSHARK
  if (!activeSession) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-neutral-200 rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center mx-auto text-amber-600">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-black uppercase tracking-wide">
            Caja Principal Cerrada
          </h2>
          <p className="text-neutral-500 text-xs max-w-md mx-auto">
            Para registrar ventas en el stand físico, es obligatorio abrir el turno de la caja principal compartida con el conteo inicial de efectivo.
          </p>
        </div>

        <form onSubmit={handleOpenCash} className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Responsable de Apertura:
            </label>
            <div className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs text-black font-bold">
              {currentUser?.full_name} ({currentUser?.role})
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Efectivo Inicial en Gaveta (S/):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-neutral-500 font-bold">S/</span>
              <input
                type="number"
                step="0.10"
                min="0"
                required
                value={initialCashInput}
                onChange={(e) => setInitialCashInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-neutral-200 rounded-lg pl-8 pr-3 py-2 text-sm text-neutral-900 font-bold focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Observaciones de Apertura (opcional):
            </label>
            <input
              type="text"
              placeholder="Ej. Apertura de turno stand - billetes y monedas contados"
              value={openNotesInput}
              onChange={(e) => setOpenNotesInput(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={openingSession}
            className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-black rounded-lg text-xs uppercase tracking-wider shadow-md transition"
          >
            {openingSession ? 'Abriendo Turno...' : 'Abrir Caja Principal y Comenzar a Vender'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 text-neutral-900">
      {/* Comprobante interno cuando la venta se confirma */}
      {completedSale && (
        <TicketReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* Barra Superior del POS (Colores del Catálogo Principal) */}
      <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-white">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-black tracking-wide uppercase">
              Punto de Venta Stand &bull; POS
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span>Caja: <b className="text-emerald-700">{activeSession.session_code}</b></span>
              <span>&bull;</span>
              <span>Vendedor: <b className="text-neutral-900">{currentUser?.full_name}</b></span>
            </div>
          </div>
        </div>

        {/* Búsqueda rápida por SKU / Nombre */}
        <div className="flex-1 max-w-lg relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Escanear o buscar por SKU, prenda, color, talla..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-black rounded-full pl-9 pr-4 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none transition shadow-inner"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Botón Salir / Cerrar Sesión */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:text-red-600 hover:bg-red-50 border border-neutral-200 hover:border-red-200 rounded-lg transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Cuerpo principal: Catálogo Izquierda (60%) | Carrito & Cobro Derecha (40%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Catálogo de Variantes para Venta Rápida */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
            <span className="text-xs font-black uppercase tracking-wider text-black">
              Prendas en Stand ({searchResults.length})
            </span>
            <span className="text-[11px] text-neutral-500 font-semibold">
              Clic para agregar a la orden
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {searchResults.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-400 space-y-2">
                <Search className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-xs font-semibold">No se encontraron prendas con ese término.</p>
              </div>
            ) : (
              searchResults.map((variant) => {
                const isOutOfStock = variant.stock === 0;
                const isLowStock = variant.stock === 1;

                return (
                  <button
                    key={variant.id}
                    onClick={() => addToCart(variant)}
                    disabled={isOutOfStock}
                    className={`text-left p-2.5 rounded-lg border flex flex-col justify-between transition-all duration-150 relative group ${
                      isOutOfStock
                        ? 'bg-neutral-50 border-neutral-200 opacity-40 cursor-not-allowed'
                        : 'bg-white border-neutral-200 hover:border-black hover:shadow-md active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-800">
                        {variant.sku}
                      </span>
                      <span
                        className={`text-[9.5px] font-black px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'text-red-700 bg-red-50'
                            : isLowStock
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-emerald-800 bg-emerald-50'
                        }`}
                      >
                        {isOutOfStock ? '0' : `${variant.stock} disp`}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-1 group-hover:text-black transition">
                        {variant.product_name}
                      </h4>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <span className="font-bold text-black">T:{variant.size}</span>
                        <span>&bull;</span>
                        <span className="truncate">{variant.color}</span>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-black text-black">
                        S/ {(variant.effective_price || 0).toFixed(2)}
                      </span>
                      <div className="w-5 h-5 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 group-hover:bg-black group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel del Carrito y Liquidación de Venta */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          {/* Header del Carrito */}
          <div className="p-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-black" />
              <span className="text-xs font-black text-black uppercase tracking-wider">
                Orden Actual ({cartItems.reduce((s, i) => s + i.quantity, 0)})
              </span>
            </div>

            {/* Selector de Canal */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-neutral-200 text-[10px]">
              <button
                type="button"
                onClick={() => setSaleChannel('pos')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  saleChannel === 'pos' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                Stand POS
              </button>
              <button
                type="button"
                onClick={() => setSaleChannel('whatsapp')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  saleChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                WhatsApp
              </button>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase tracking-wider"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Lista de Items en Carrito */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto opacity-30 stroke-1" />
                <p className="text-xs font-bold text-neutral-700">No hay prendas en la orden.</p>
                <p className="text-[11px] text-neutral-500">Haz clic en una prenda o busca por SKU para añadirla.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.variantId}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[9px] font-bold bg-neutral-200 text-neutral-800 px-1 rounded">
                        {item.sku}
                      </span>
                      <h5 className="text-xs font-bold text-neutral-900 truncate">{item.productName}</h5>
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                      <span>T:<b className="text-black">{item.size}</b></span>
                      <span>&bull;</span>
                      <span className="truncate">{item.color}</span>
                      <span>&bull;</span>
                      <span>S/ {item.unitPrice.toFixed(2)} c/u</span>
                    </div>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded p-0.5">
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="p-1 text-neutral-500 hover:text-black"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-black">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      className="p-1 text-neutral-500 hover:text-black"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[55px]">
                    <span className="text-xs font-black text-black">
                      S/ {item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-1 text-neutral-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* SELECCIÓN DE COMPROBANTE Y DATOS DEL CLIENTE / EMPRESA */}
          <div className="p-3 border-t border-neutral-200 bg-white space-y-2.5">
            {/* Selector de Comprobante: Boleta vs Factura vs Ticket */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-700">
                  Tipo de Comprobante:
                </span>
                <span className="text-[9px] font-bold text-neutral-400 uppercase">Precios Inc. IGV (18%)</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setReceiptType('boleta');
                    setCustomerDocType('DNI');
                    setFoundCustomerNotice(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    receiptType === 'boleta'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Boleta</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReceiptType('factura');
                    setCustomerDocType('RUC');
                    setFoundCustomerNotice(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    receiptType === 'factura'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Factura (RUC)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReceiptType('ticket');
                    setFoundCustomerNotice(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    receiptType === 'ticket'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span>Ticket Rápido</span>
                </button>
              </div>
            </div>

            {/* Datos del Cliente / Empresa */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-neutral-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  {receiptType === 'factura' ? 'Datos de la Empresa (Factura):' : 'Datos del Cliente (Boleta):'}
                </span>
                {foundCustomerNotice && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    {foundCustomerNotice}
                  </span>
                )}
              </div>

              {receiptType === 'factura' ? (
                // FORMULARIO EMPRESA / FACTURA (RUC OBLIGATORIO)
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1.5">
                    <div className="col-span-5">
                      <label className="text-[9px] font-bold uppercase text-neutral-600 block mb-0.5">
                        RUC (11 dígitos)*:
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="20XXXXXXXXX"
                        value={customerDocNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setCustomerDocNumber(val);
                          if (val.length === 11) handleLookupCustomer(val);
                        }}
                        onBlur={() => handleLookupCustomer(customerDocNumber)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-bold text-black focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="text-[9px] font-bold uppercase text-neutral-600 block mb-0.5">
                        Razón Social / Empresa*:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Inversiones Deportivas S.A.C."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-bold text-black focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-neutral-600 block mb-0.5">
                        Teléfono de Contacto:
                      </label>
                      <input
                        type="text"
                        placeholder="987654321"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-neutral-600 block mb-0.5">
                        Correo para Factura:
                      </label>
                      <input
                        type="email"
                        placeholder="facturacion@empresa.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase text-neutral-600 block mb-0.5">
                      Dirección Fiscal:
                    </label>
                    <input
                      type="text"
                      placeholder="Av. Principal 123, Lima"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              ) : (
                // FORMULARIO CLIENTE / BOLETA
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1.5">
                    <div className="col-span-5">
                      <label className="text-[9px] font-bold uppercase text-neutral-600 flex items-center justify-between mb-0.5">
                        <span>DNI (8 dígitos):</span>
                        {isLookingUpCustomer && <span className="text-[8px] text-amber-600">Buscando...</span>}
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="71234567"
                        value={customerDocNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setCustomerDocNumber(val);
                          if (val.length === 8) handleLookupCustomer(val);
                        }}
                        onBlur={() => handleLookupCustomer(customerDocNumber)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-bold text-black focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="text-[9px] font-bold uppercase text-neutral-600 block mb-0.5">
                        Nombre del Cliente:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Juan Pérez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-bold text-black focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-neutral-600 flex items-center gap-1 mb-0.5">
                        <span>Teléfono:</span>
                        <span className="text-[8px] bg-neutral-200 text-neutral-700 px-1 rounded font-bold">Importante</span>
                      </label>
                      <input
                        type="text"
                        placeholder="987654321"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-neutral-600 flex items-center gap-1 mb-0.5">
                        <span>Correo:</span>
                        <span className="text-[8px] text-neutral-400 font-semibold">(Opcional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="cliente@gmail.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Liquidación, Medios de Pago y Cobro */}
          <div className="p-3 border-t border-neutral-200 bg-neutral-50 space-y-2.5">
            {/* Totales y Desglose Tributario IGV (18%) */}
            <div className="space-y-1 text-xs bg-white p-2.5 rounded-lg border border-neutral-200">
              <div className="flex justify-between text-neutral-500 font-medium text-[11px]">
                <span>Op. Gravada (sin IGV):</span>
                <span>S/ {taxBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 font-medium text-[11px]">
                <span>I.G.V. (18% incluido):</span>
                <span>S/ {taxAmount.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-red-600 font-medium text-[11px]">
                  <span>Descuento aplicado:</span>
                  <span>- S/ {discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-600 pt-1 border-t border-neutral-100">
                <span className="text-[11px]">Ajustar Descuento (S/):</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={subtotal}
                  value={discountTotal || ''}
                  onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-20 bg-neutral-50 border border-neutral-200 rounded px-2 py-0.5 text-right text-xs text-black font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex justify-between text-sm font-black text-black pt-1.5 border-t border-neutral-200">
                <span>TOTAL A COBRAR:</span>
                <span className="text-black text-base font-black">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Medios de Pago */}
            <div className="space-y-1.5 pt-1 border-t border-neutral-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
                <span>Medio de Pago:</span>
                <button
                  type="button"
                  onClick={() => setIsMixedPayment(!isMixedPayment)}
                  className="text-black font-extrabold underline text-[10px]"
                >
                  {isMixedPayment ? 'Pago Único' : '+ Pago Mixto'}
                </button>
              </div>

              {!isMixedPayment ? (
                <>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
                      { id: 'yape', label: 'Yape', icon: Smartphone },
                      { id: 'plin', label: 'Plin', icon: Smartphone },
                      { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                      { id: 'transferencia', label: 'Transf.', icon: Wallet },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                          className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-0.5 transition ${
                            isSel
                              ? 'bg-black border-black text-white shadow-sm'
                              : 'bg-white border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Campo de vuelto para efectivo */}
                  {paymentMethod === 'efectivo' && total > 0 && (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-neutral-200">
                      <div className="flex-1">
                        <span className="text-[10px] text-neutral-500 font-bold block">Paga con (S/):</span>
                        <input
                          type="number"
                          step="0.5"
                          min={total}
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          placeholder={total.toFixed(2)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs text-black font-bold focus:outline-none focus:border-black"
                        />
                      </div>
                      <div className="text-right flex-1">
                        <span className="text-[10px] text-neutral-500 font-bold block">Vuelto a entregar:</span>
                        <span className="text-sm font-black text-emerald-600">
                          S/ {changeDue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1.5 bg-white p-2 rounded-lg border border-neutral-200">
                  {mixedPayments.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={p.method}
                        onChange={(e) => {
                          const val = e.target.value as PaymentMethod;
                          setMixedPayments((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, method: val } : item))
                          );
                        }}
                        className="bg-neutral-50 border border-neutral-200 text-[10px] text-black font-bold rounded p-1"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="yape">Yape</option>
                        <option value="plin">Plin</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Monto S/"
                        value={p.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMixedPayments((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                          );
                        }}
                        className="w-24 bg-neutral-50 border border-neutral-200 rounded p-1 text-xs text-black font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Referencia (opcional)"
                        value={p.ref}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMixedPayments((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, ref: val } : item))
                          );
                        }}
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded p-1 text-[10px] text-neutral-800"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error banner si falló */}
            {saleError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{saleError}</span>
              </div>
            )}

            {/* Botón de Confirmación de Venta */}
            <button
              onClick={handleSubmitSale}
              disabled={isSubmitting || cartItems.length === 0 || total <= 0}
              className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition transform active:scale-98 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Validando Inventario & Registrando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar Cobro y Venta (S/ {total.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
