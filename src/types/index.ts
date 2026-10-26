export type UserRole = 'admin' | 'vendedor';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GenderTarget = 'dama' | 'hombre' | 'unisex';

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender?: GenderTarget;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  contact_info?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  slug: string;
  description?: string;
  gender: GenderTarget;
  brand: string;
  base_price: number;
  is_published: boolean;
  is_new: boolean;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
  primary_image?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  product_name?: string;
  product_slug?: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  low_stock_threshold: number;
  cost_price?: number | null;
  price_override?: number | null;
  effective_price?: number;
  supplier_id?: string | null;
  supplier_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  primary_image?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id?: string | null;
  storage_path: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export type PaymentMethod = 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta';

export type CashSessionStatus = 'open' | 'closed';

export interface CashSession {
  id: string;
  session_code: string;
  opened_by: string;
  opened_by_name?: string;
  opened_at: string;
  initial_cash: number;
  status: CashSessionStatus;
  closed_by?: string | null;
  closed_by_name?: string;
  closed_at?: string | null;
  notes?: string;
  closure?: CashClosure;
}

export type CashMovementType = 'ingreso_extra' | 'gasto' | 'retiro' | 'deposito' | 'ajuste';

export interface CashMovement {
  id: string;
  session_id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  reference?: string;
  registered_by: string;
  registered_by_name?: string;
  created_at: string;
}

export interface CashClosure {
  id: string;
  session_id: string;
  closed_by: string;
  closed_by_name?: string;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  digital_totals_json: {
    yape: number;
    plin: number;
    tarjeta: number;
    transferencia: number;
  };
  notes?: string;
  closed_at: string;
}

export type SalesChannel = 'pos' | 'whatsapp';
export type SaleStatus = 'completed' | 'cancelled';
export type ReceiptType = 'boleta' | 'factura' | 'ticket';
export type DocumentType = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';

export interface Customer {
  id: string;
  doc_type: DocumentType;
  doc_number: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  total_spent: number;
  orders_count: number;
  last_purchase_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  receipt_number: string;
  receipt_type?: ReceiptType;
  session_id: string;
  seller_id: string;
  seller_name?: string;
  channel: SalesChannel;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  total: number;
  tax_base?: number; // Base Imponible (Valor Venta sin IGV)
  tax_amount?: number; // Monto IGV (18%)
  customer_id?: string;
  customer_doc_type?: DocumentType;
  customer_doc_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
  items?: SaleItem[];
  payments?: PaymentRecord[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  variant_id: string;
  sku_snapshot: string;
  product_name_snapshot: string;
  size_snapshot: string;
  color_snapshot: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface PaymentRecord {
  id: string;
  sale_id: string;
  session_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  registered_by: string;
  registered_by_name?: string;
  created_at: string;
}

export type InventoryMovementType =
  | 'compra'
  | 'venta'
  | 'devolucion'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'reversion';

export interface InventoryMovement {
  id: string;
  variant_id: string;
  variant_sku?: string;
  product_name?: string;
  size?: string;
  color?: string;
  type: InventoryMovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference_id?: string;
  registered_by: string;
  registered_by_name?: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id?: string | null;
  supplier_name?: string;
  registered_by: string;
  registered_by_name?: string;
  invoice_ref?: string;
  status: 'pending' | 'received' | 'cancelled';
  total_cost: number;
  notes?: string;
  created_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  variant_id: string;
  sku?: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface AppSetting {
  key: string;
  value: Record<string, any>;
  updated_at: string;
  updated_by?: string;
}

// Request Payload Types for POS Sale
export interface PosSaleItemPayload {
  variant_id: string;
  sku: string;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  subtotal: number;
}

export interface PosPaymentPayload {
  payment_method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface StoreSettings {
  store_name: string;
  tagline: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  currency: string;
  currency_symbol: string;
  address: string;
  store_phone?: string;
  store_email?: string;
  store_ruc?: string;
  ticket_footer_phrase?: string;
  low_stock_alert_threshold: number;
}

export interface CreatePosSaleRequest {
  session_id: string;
  seller_id: string;
  channel: SalesChannel;
  receipt_type?: ReceiptType;
  customer_doc_type?: DocumentType;
  customer_doc_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  notes?: string;
  subtotal: number;
  discount: number;
  total: number;
  idempotency_key?: string;
  items: PosSaleItemPayload[];
  payments: PosPaymentPayload[];
}
