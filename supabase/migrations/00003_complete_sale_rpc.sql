-- Atomic sale completion for POS (online + offline sync)
-- Bypasses RLS for stock decrement via SECURITY DEFINER while enforcing auth.uid()

CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number text,
  p_payment_type text,
  p_status text,
  p_cashier_id uuid,
  p_items jsonb,
  p_discount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_sale_id uuid;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2);
  v_total numeric(10, 2);
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_stock integer;
  v_is_active boolean;
  v_product_price numeric(10, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لإتمام البيع';
  END IF;

  IF p_cashier_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'معرف الكاشير غير مطابق للمستخدم الحالي';
  END IF;

  v_role := public.get_auth_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'ليست لديك صلاحية لإتمام البيع';
  END IF;

  IF p_payment_type NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'طريقة الدفع غير صالحة';
  END IF;

  IF p_status NOT IN ('completed', 'synced_offline') THEN
    RAISE EXCEPTION 'حالة الفاتورة غير صالحة';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'سلة المبيعات فارغة';
  END IF;

  v_discount := GREATEST(COALESCE(p_discount, 0), 0);

  -- Validate items and compute subtotal first (with row locks)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::numeric(10, 2);

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'عنصر بيع غير صالح';
    END IF;

    SELECT stock_quantity, is_active, price
    INTO v_stock, v_is_active, v_product_price
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_product_id;
    END IF;

    IF COALESCE(v_is_active, false) = false THEN
      RAISE EXCEPTION 'المنتج غير نشط: %', v_product_id;
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'المخزون غير كافٍ للمنتج: %', v_product_id;
    END IF;

    -- Prefer client unit_price when provided; fall back to catalog price
    IF v_unit_price IS NULL THEN
      v_unit_price := v_product_price;
    END IF;

    IF v_unit_price < 0 THEN
      RAISE EXCEPTION 'سعر الوحدة غير صالح';
    END IF;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  IF v_discount > v_subtotal THEN
    v_discount := v_subtotal;
  END IF;

  v_total := round(v_subtotal - v_discount, 2);

  INSERT INTO public.sales (
    invoice_number,
    cashier_id,
    total_amount,
    payment_type,
    status
  )
  VALUES (
    p_invoice_number,
    p_cashier_id,
    v_total,
    p_payment_type,
    p_status
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := COALESCE(
      (v_item ->> 'unit_price')::numeric(10, 2),
      (SELECT price FROM public.products WHERE id = v_product_id)
    );
    v_line_total := round(v_unit_price * v_quantity, 2);

    INSERT INTO public.sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      total_price
    )
    VALUES (
      v_sale_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_line_total
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = v_product_id;
  END LOOP;

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_sale(
  text, text, text, uuid, jsonb, numeric
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_sale(
  text, text, text, uuid, jsonb, numeric
) TO authenticated;
