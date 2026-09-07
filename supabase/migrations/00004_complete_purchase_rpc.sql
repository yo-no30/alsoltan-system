-- Atomic purchase posting for admin back-office
-- Updates purchases, purchase_items, product stock/cost, and supplier debt

CREATE OR REPLACE FUNCTION public.complete_purchase(
  p_supplier_id uuid,
  p_invoice_number text,
  p_payment_type text,
  p_paid_amount numeric,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_purchase_id uuid;
  v_total numeric(10, 2) := 0;
  v_paid numeric(10, 2);
  v_unpaid numeric(10, 2);
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_cost_price numeric(10, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_role := public.get_auth_role();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'هذه العملية متاحة لمدير النظام فقط';
  END IF;

  IF p_supplier_id IS NULL THEN
    RAISE EXCEPTION 'المورد مطلوب';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION 'المورد غير موجود';
  END IF;

  IF p_invoice_number IS NULL OR btrim(p_invoice_number) = '' THEN
    RAISE EXCEPTION 'رقم فاتورة الشراء مطلوب';
  END IF;

  IF p_payment_type NOT IN ('cash', 'credit') THEN
    RAISE EXCEPTION 'نوع الدفع غير صالح';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'أضف عنصراً واحداً على الأقل للفاتورة';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_cost_price := (v_item ->> 'cost_price')::numeric(10, 2);

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'عنصر شراء غير صالح';
    END IF;

    IF v_cost_price IS NULL OR v_cost_price < 0 THEN
      RAISE EXCEPTION 'سعر التكلفة غير صالح';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_product_id) THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_product_id;
    END IF;

    v_total := v_total + round(v_cost_price * v_quantity, 2);
  END LOOP;

  v_total := round(v_total, 2);
  v_paid := GREATEST(COALESCE(p_paid_amount, 0), 0);

  IF p_payment_type = 'cash' THEN
    v_paid := v_total;
  END IF;

  IF v_paid > v_total THEN
    RAISE EXCEPTION 'المبلغ المدفوع أكبر من إجمالي الفاتورة';
  END IF;

  INSERT INTO public.purchases (
    supplier_id,
    invoice_number,
    total_amount,
    paid_amount,
    payment_type
  )
  VALUES (
    p_supplier_id,
    btrim(p_invoice_number),
    v_total,
    round(v_paid, 2),
    p_payment_type
  )
  RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_cost_price := (v_item ->> 'cost_price')::numeric(10, 2);

    INSERT INTO public.purchase_items (
      purchase_id,
      product_id,
      quantity,
      cost_price
    )
    VALUES (
      v_purchase_id,
      v_product_id,
      v_quantity,
      v_cost_price
    );

    UPDATE public.products
    SET
      stock_quantity = stock_quantity + v_quantity,
      cost_price = v_cost_price
    WHERE id = v_product_id;
  END LOOP;

  v_unpaid := round(v_total - v_paid, 2);

  IF p_payment_type = 'credit' AND v_unpaid > 0 THEN
    UPDATE public.suppliers
    SET balance_due = round(balance_due + v_unpaid, 2)
    WHERE id = p_supplier_id;
  END IF;

  RETURN v_purchase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_purchase(
  uuid, text, text, numeric, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_purchase(
  uuid, text, text, numeric, jsonb
) TO authenticated;
