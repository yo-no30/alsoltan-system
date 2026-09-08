-- Auto-post journal entries (له/عليه) from sales, purchases, and payments

-- ---------------------------------------------------------------------------
-- complete_sale: operational sale + balanced journal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number text,
  p_payment_type text,
  p_status text,
  p_cashier_id uuid,
  p_items jsonb,
  p_discount numeric DEFAULT 0,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_sale_id uuid;
  v_invoice_number text;
  v_preferred text;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2);
  v_total numeric(10, 2);
  v_paid numeric(10, 2);
  v_unpaid numeric(10, 2);
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_stock integer;
  v_is_active boolean;
  v_product_price numeric(10, 2);
  v_cost_price numeric(10, 2);
  v_cogs numeric(12, 2) := 0;
  v_lines jsonb := '[]'::jsonb;
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

  IF p_payment_type NOT IN ('cash', 'credit') THEN
    RAISE EXCEPTION 'طريقة الدفع غير صالحة';
  END IF;

  IF p_status NOT IN ('completed', 'synced_offline') THEN
    RAISE EXCEPTION 'حالة الفاتورة غير صالحة';
  END IF;

  IF p_payment_type = 'credit' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'يجب اختيار عميل للبيع الآجل';
  END IF;

  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'العميل غير موجود';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'سلة المبيعات فارغة';
  END IF;

  v_discount := GREATEST(COALESCE(p_discount, 0), 0);
  v_preferred := NULLIF(btrim(COALESCE(p_invoice_number, '')), '');

  IF v_preferred ~ '^[0-9]+$'
     AND NOT EXISTS (
       SELECT 1 FROM public.sales WHERE invoice_number = v_preferred
     )
  THEN
    v_invoice_number := v_preferred;
  ELSE
    v_invoice_number := nextval('public.sales_invoice_seq')::text;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::numeric(10, 2);

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'عنصر بيع غير صالح';
    END IF;

    SELECT stock_quantity, is_active, price, cost_price
    INTO v_stock, v_is_active, v_product_price, v_cost_price
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

    IF v_unit_price IS NULL THEN
      v_unit_price := v_product_price;
    END IF;

    IF v_unit_price < 0 THEN
      RAISE EXCEPTION 'سعر الوحدة غير صالح';
    END IF;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_cogs := v_cogs + round(COALESCE(v_cost_price, 0) * v_quantity, 2);
  END LOOP;

  IF v_discount > v_subtotal THEN
    v_discount := v_subtotal;
  END IF;

  v_total := round(v_subtotal - v_discount, 2);
  v_cogs := round(v_cogs, 2);

  IF p_payment_type = 'cash' THEN
    v_paid := v_total;
  ELSE
    v_paid := 0;
  END IF;

  INSERT INTO public.sales (
    invoice_number,
    cashier_id,
    customer_id,
    total_amount,
    paid_amount,
    payment_type,
    status
  )
  VALUES (
    v_invoice_number,
    p_cashier_id,
    p_customer_id,
    v_total,
    v_paid,
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

  v_unpaid := round(v_total - v_paid, 2);

  IF p_payment_type = 'credit' AND v_unpaid > 0 AND p_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET balance_due = round(balance_due + v_unpaid, 2)
    WHERE id = p_customer_id;
  END IF;

  -- Journal: sales revenue + COGS
  IF v_total > 0 THEN
    IF p_payment_type = 'cash' THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('system_key', 'cash', 'alayh', v_total, 'lahu', 0)
      );
    ELSE
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('system_key', 'ar', 'alayh', v_total, 'lahu', 0)
      );
    END IF;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('system_key', 'sales', 'alayh', 0, 'lahu', v_total)
    );
  END IF;

  IF v_cogs > 0 THEN
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('system_key', 'cogs', 'alayh', v_cogs, 'lahu', 0),
      jsonb_build_object('system_key', 'inventory', 'alayh', 0, 'lahu', v_cogs)
    );
  END IF;

  IF jsonb_array_length(v_lines) >= 2 THEN
    PERFORM public.post_journal_entry(
      (timezone('utc', now()))::date,
      'بيع فاتورة ' || v_invoice_number,
      'sale',
      v_sale_id,
      v_lines,
      p_cashier_id
    );
  END IF;

  PERFORM setval(
    'public.sales_invoice_seq',
    GREATEST(
      (SELECT COALESCE(MAX(invoice_number::bigint), 0)
       FROM public.sales
       WHERE invoice_number ~ '^[0-9]+$'),
      1
    ),
    true
  );

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- complete_purchase + journal
-- ---------------------------------------------------------------------------
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
  v_lines jsonb := '[]'::jsonb;
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

  IF v_total > 0 THEN
    v_lines := jsonb_build_array(
      jsonb_build_object('system_key', 'inventory', 'alayh', v_total, 'lahu', 0)
    );

    IF v_paid > 0 THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('system_key', 'cash', 'alayh', 0, 'lahu', v_paid)
      );
    END IF;

    IF v_unpaid > 0 THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('system_key', 'ap', 'alayh', 0, 'lahu', v_unpaid)
      );
    END IF;

    PERFORM public.post_journal_entry(
      (timezone('utc', now()))::date,
      'شراء فاتورة ' || btrim(p_invoice_number),
      'purchase',
      v_purchase_id,
      v_lines,
      auth.uid()
    );
  END IF;

  RETURN v_purchase_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Customer payment RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_customer_id uuid,
  p_amount numeric
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_customer public.customers;
  v_amount numeric(12, 2);
  v_payment_id uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_role := public.get_auth_role();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'هذه العملية متاحة لمدير النظام فقط';
  END IF;

  v_amount := round(COALESCE(p_amount, 0), 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التسديد يجب أن يكون أكبر من صفر';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'العميل غير موجود';
  END IF;

  IF v_amount > v_customer.balance_due THEN
    RAISE EXCEPTION 'مبلغ التسديد أكبر من رصيد الدين المستحق';
  END IF;

  UPDATE public.customers
  SET balance_due = round(balance_due - v_amount, 2)
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  PERFORM public.post_journal_entry(
    (timezone('utc', now()))::date,
    'تحصيل من عميل: ' || v_customer.name,
    'customer_payment',
    v_payment_id,
    jsonb_build_array(
      jsonb_build_object('system_key', 'cash', 'alayh', v_amount, 'lahu', 0),
      jsonb_build_object('system_key', 'ar', 'alayh', 0, 'lahu', v_amount)
    ),
    auth.uid()
  );

  RETURN v_customer;
END;
$$;

REVOKE ALL ON FUNCTION public.record_customer_payment(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid, numeric) TO authenticated;

-- ---------------------------------------------------------------------------
-- Supplier payment RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_supplier_id uuid,
  p_amount numeric
)
RETURNS public.suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_supplier public.suppliers;
  v_amount numeric(12, 2);
  v_payment_id uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_role := public.get_auth_role();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'هذه العملية متاحة لمدير النظام فقط';
  END IF;

  v_amount := round(COALESCE(p_amount, 0), 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التسديد يجب أن يكون أكبر من صفر';
  END IF;

  SELECT * INTO v_supplier
  FROM public.suppliers
  WHERE id = p_supplier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المورد غير موجود';
  END IF;

  IF v_amount > v_supplier.balance_due THEN
    RAISE EXCEPTION 'مبلغ التسديد أكبر من رصيد الدين المستحق';
  END IF;

  UPDATE public.suppliers
  SET balance_due = round(balance_due - v_amount, 2)
  WHERE id = p_supplier_id
  RETURNING * INTO v_supplier;

  PERFORM public.post_journal_entry(
    (timezone('utc', now()))::date,
    'سداد لمورد: ' || v_supplier.name,
    'supplier_payment',
    v_payment_id,
    jsonb_build_array(
      jsonb_build_object('system_key', 'ap', 'alayh', v_amount, 'lahu', 0),
      jsonb_build_object('system_key', 'cash', 'alayh', 0, 'lahu', v_amount)
    ),
    auth.uid()
  );

  RETURN v_supplier;
END;
$$;

REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid, numeric) TO authenticated;

-- Manual journal posting for admin UI
CREATE OR REPLACE FUNCTION public.create_manual_journal_entry(
  p_entry_date date,
  p_memo text,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF public.get_auth_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'القيد اليدوي متاح للمدير فقط';
  END IF;

  RETURN public.post_journal_entry(
    COALESCE(p_entry_date, (timezone('utc', now()))::date),
    COALESCE(NULLIF(btrim(p_memo), ''), 'قيد يدوي'),
    'manual',
    NULL,
    p_lines,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_journal_entry(date, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_manual_journal_entry(date, text, jsonb) TO authenticated;
