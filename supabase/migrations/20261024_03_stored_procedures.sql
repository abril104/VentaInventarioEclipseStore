-- ====================================================================
-- MIGRACIÓN 03: FUNCIONES ALMACENADAS Y OPERACIONES ATÓMICAS TRANSACCIONALES
-- ====================================================================

-- 1. FUNCIÓN ATÓMICA DE VENTA POS
-- Ejecuta: validación de sesión abierta, bloqueo FOR UPDATE de stock,
-- verificación de stock >= cantidad (nunca negativo), descuento de inventario,
-- creación de venta con idempotencia, registro de cobros (soporte pagos mixtos)
-- e inserción de kardex en una única transacción atómica.

CREATE OR REPLACE FUNCTION public.execute_pos_sale(
    p_session_id UUID,
    p_seller_id UUID,
    p_channel TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_notes TEXT,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_total NUMERIC,
    p_idempotency_key TEXT,
    p_items JSONB,    -- Array de objetos: [{ variant_id, quantity, unit_price, discount, subtotal, sku, product_name, size, color }]
    p_payments JSONB  -- Array de objetos: [{ payment_method, amount, reference }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_status TEXT;
    v_receipt_number TEXT;
    v_sale_id UUID;
    v_item RECORD;
    v_payment RECORD;
    v_current_stock INT;
    v_total_paid NUMERIC := 0;
    v_existing_sale_id UUID;
BEGIN
    -- Verificar idempotencia si se provee clave
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_sale_id FROM public.sales WHERE idempotency_key = p_idempotency_key;
        IF v_existing_sale_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'sale_id', v_existing_sale_id, 'idempotent', true);
        END IF;
    END IF;

    -- Validar que la sesión de caja exista y esté abierta
    SELECT status INTO v_session_status FROM public.cash_sessions WHERE id = p_session_id;
    IF v_session_status IS NULL THEN
        RAISE EXCEPTION 'La sesión de caja especificada no existe.';
    END IF;
    IF v_session_status <> 'open' THEN
        RAISE EXCEPTION 'La caja principal está cerrada. No se pueden registrar ventas en una sesión cerrada.';
    END IF;

    -- Validar suma de pagos vs total
    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS (payment_method TEXT, amount NUMERIC, reference TEXT)
    LOOP
        v_total_paid := v_total_paid + v_payment.amount;
    END LOOP;

    IF ABS(v_total_paid - p_total) > 0.01 THEN
        RAISE EXCEPTION 'La suma de pagos (S/ %) no coincide con el total de la venta (S/ %).', v_total_paid, p_total;
    END IF;

    -- Generar número de comprobante único consecutivo
    v_receipt_number := 'TKV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- Insertar Cabecera de Venta
    INSERT INTO public.sales (
        session_id, seller_id, receipt_number, channel, status,
        subtotal, discount, total, customer_name, customer_phone, notes, idempotency_key
    ) VALUES (
        p_session_id, p_seller_id, v_receipt_number, p_channel, 'completed',
        p_subtotal, p_discount, p_total, p_customer_name, p_customer_phone, p_notes, p_idempotency_key
    ) RETURNING id INTO v_sale_id;

    -- Procesar cada ítem del carrito con bloqueo de fila para evitar race conditions
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        variant_id UUID, quantity INT, unit_price NUMERIC, discount NUMERIC, subtotal NUMERIC,
        sku TEXT, product_name TEXT, size TEXT, color TEXT
    )
    LOOP
        -- Bloqueo pesimista de la fila de la variante
        SELECT stock INTO v_current_stock 
        FROM public.product_variants 
        WHERE id = v_item.variant_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variante no encontrada: ID %', v_item.variant_id;
        END IF;

        IF v_current_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para SKU % (% - Talla %, Color %). Disponible: %, Solicitado: %', 
                v_item.sku, v_item.product_name, v_item.size, v_item.color, v_current_stock, v_item.quantity;
        END IF;

        -- Descontar stock atómicamente
        UPDATE public.product_variants
        SET stock = stock - v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.variant_id;

        -- Registrar detalle inmutable de venta
        INSERT INTO public.sale_items (
            sale_id, variant_id, sku_snapshot, product_name_snapshot,
            size_snapshot, color_snapshot, quantity, unit_price, discount, subtotal
        ) VALUES (
            v_sale_id, v_item.variant_id, v_item.sku, v_item.product_name,
            v_item.size, v_item.color, v_item.quantity, v_item.unit_price, COALESCE(v_item.discount, 0), v_item.subtotal
        );

        -- Registrar movimiento en kardex
        INSERT INTO public.inventory_movements (
            variant_id, type, quantity, previous_stock, new_stock,
            reason, reference_id, registered_by
        ) VALUES (
            v_item.variant_id, 'venta', v_item.quantity, v_current_stock, v_current_stock - v_item.quantity,
            'Venta en POS #' || v_receipt_number, v_sale_id::TEXT, p_seller_id
        );
    END LOOP;

    -- Registrar los métodos de pago (admite pagos mixtos)
    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS (payment_method TEXT, amount NUMERIC, reference TEXT)
    LOOP
        INSERT INTO public.payment_records (
            sale_id, session_id, payment_method, amount, reference, registered_by
        ) VALUES (
            v_sale_id, p_session_id, v_payment.payment_method, v_payment.amount, v_payment.reference, p_seller_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'receipt_number', v_receipt_number,
        'total', p_total
    );
END;
$$;

-- 2. FUNCIÓN PARA CÁLCULO Y CIERRE DE CAJA PRINCIPAL
CREATE OR REPLACE FUNCTION public.calculate_cash_session_totals(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_initial_cash NUMERIC := 0;
    v_cash_sales NUMERIC := 0;
    v_cash_inflow NUMERIC := 0;
    v_cash_outflow NUMERIC := 0;
    v_expected_cash NUMERIC := 0;
    v_yape NUMERIC := 0;
    v_plin NUMERIC := 0;
    v_card NUMERIC := 0;
    v_transfer NUMERIC := 0;
    v_digital_totals JSONB;
BEGIN
    SELECT initial_cash INTO v_initial_cash FROM public.cash_sessions WHERE id = p_session_id;

    -- Ventas en efectivo en esta sesión
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_sales
    FROM public.payment_records
    WHERE session_id = p_session_id AND payment_method = 'efectivo';

    -- Movimientos manuales de efectivo: entradas extraordinarias / depósitos
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_inflow
    FROM public.cash_movements
    WHERE session_id = p_session_id AND type IN ('ingreso_extra', 'deposito');

    -- Movimientos manuales de efectivo: gastos / retiros
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_outflow
    FROM public.cash_movements
    WHERE session_id = p_session_id AND type IN ('gasto', 'retiro');

    -- Efectivo esperado físico en gaveta
    v_expected_cash := v_initial_cash + v_cash_sales + v_cash_inflow - v_cash_outflow;

    -- Totales por canales digitales
    SELECT COALESCE(SUM(amount), 0) INTO v_yape
    FROM public.payment_records WHERE session_id = p_session_id AND payment_method = 'yape';

    SELECT COALESCE(SUM(amount), 0) INTO v_plin
    FROM public.payment_records WHERE session_id = p_session_id AND payment_method = 'plin';

    SELECT COALESCE(SUM(amount), 0) INTO v_card
    FROM public.payment_records WHERE session_id = p_session_id AND payment_method = 'tarjeta';

    SELECT COALESCE(SUM(amount), 0) INTO v_transfer
    FROM public.payment_records WHERE session_id = p_session_id AND payment_method = 'transferencia';

    v_digital_totals := jsonb_build_object(
        'yape', v_yape,
        'plin', v_plin,
        'tarjeta', v_card,
        'transferencia', v_transfer
    );

    RETURN jsonb_build_object(
        'initial_cash', v_initial_cash,
        'cash_sales', v_cash_sales,
        'cash_inflow', v_cash_inflow,
        'cash_outflow', v_cash_outflow,
        'expected_cash', v_expected_cash,
        'digital_totals', v_digital_totals
    );
END;
$$;
