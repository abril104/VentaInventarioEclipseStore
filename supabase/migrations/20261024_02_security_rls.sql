-- ====================================================================
-- MIGRACIÓN 02: SEGURIDAD ROW LEVEL SECURITY (RLS) Y ROLES
-- ====================================================================

-- 1. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 2. FUNCIONES AUXILIARES PARA ROLES
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_active_seller_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLÍTICAS PARA CATÁLOGO PÚBLICO (Lectura libre de productos publicados y stock)
CREATE POLICY "Public Read Categories" ON public.categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public Read Products" ON public.products
    FOR SELECT USING (is_published = true);

CREATE POLICY "Public Read Product Variants" ON public.product_variants
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public Read Images" ON public.product_images
    FOR SELECT USING (true);

CREATE POLICY "Public Read Settings" ON public.app_settings
    FOR SELECT USING (key IN ('store_name', 'store_phone', 'store_whatsapp', 'store_address', 'catalog_message', 'logo_url'));

-- 4. POLÍTICAS DE ADMINISTRADOR (Acceso total en gestión)
CREATE POLICY "Admin Full Categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Products" ON public.products FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Variants" ON public.product_variants FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Images" ON public.product_images FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Purchases" ON public.purchases FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Purchase Items" ON public.purchase_items FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Closures" ON public.cash_closures FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Settings" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Full Profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- 5. POLÍTICAS PARA VENDEDORES (Operación en Tienda)
CREATE POLICY "Staff Read Profiles" ON public.profiles
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Read Suppliers" ON public.suppliers
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Read Cash Sessions" ON public.cash_sessions
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Insert Cash Sessions" ON public.cash_sessions
    FOR INSERT TO authenticated WITH CHECK (public.is_active_seller_or_admin() AND opened_by = auth.uid());

CREATE POLICY "Staff Read Sales" ON public.sales
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Insert Sales" ON public.sales
    FOR INSERT TO authenticated WITH CHECK (public.is_active_seller_or_admin() AND seller_id = auth.uid());

CREATE POLICY "Staff Read Sale Items" ON public.sale_items
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Insert Sale Items" ON public.sale_items
    FOR INSERT TO authenticated WITH CHECK (public.is_active_seller_or_admin());

CREATE POLICY "Staff Read Payment Records" ON public.payment_records
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Insert Payment Records" ON public.payment_records
    FOR INSERT TO authenticated WITH CHECK (public.is_active_seller_or_admin() AND registered_by = auth.uid());

CREATE POLICY "Staff Read Cash Movements" ON public.cash_movements
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Insert Cash Movements" ON public.cash_movements
    FOR INSERT TO authenticated WITH CHECK (public.is_active_seller_or_admin() AND registered_by = auth.uid());

CREATE POLICY "Staff Read Inventory Movements" ON public.inventory_movements
    FOR SELECT TO authenticated USING (public.is_active_seller_or_admin());

CREATE POLICY "Staff Insert Inventory Movements" ON public.inventory_movements
    FOR INSERT TO authenticated WITH CHECK (public.is_active_seller_or_admin() AND registered_by = auth.uid());
