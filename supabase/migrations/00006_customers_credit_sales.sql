-- Customers + credit sales (نقداً / آجل)

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  balance_due numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_balance_due_non_negative CHECK (balance_due >= 0)
);

CREATE INDEX customers_name_idx ON public.customers (name);
CREATE INDEX customers_phone_idx ON public.customers (phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_customers"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

-- Cashiers need to pick customers for credit sales at POS
CREATE POLICY "cashier_select_customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() = 'cashier');

-- ---------------------------------------------------------------------------
-- sales: customer + paid_amount; payment_type cash | credit
-- ---------------------------------------------------------------------------
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10, 2);

UPDATE public.sales
SET paid_amount = total_amount
WHERE paid_amount IS NULL;

ALTER TABLE public.sales
  ALTER COLUMN paid_amount SET DEFAULT 0,
  ALTER COLUMN paid_amount SET NOT NULL;

CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON public.sales (customer_id);

-- Migrate legacy card payments to cash before tightening the check
UPDATE public.sales
SET payment_type = 'cash'
WHERE payment_type = 'card';

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_payment_type_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_type_check
  CHECK (payment_type IN ('cash', 'credit'));

ALTER TABLE public.sales
  ADD CONSTRAINT sales_paid_amount_non_negative CHECK (paid_amount >= 0);

ALTER TABLE public.sales
  ADD CONSTRAINT sales_paid_amount_lte_total CHECK (paid_amount <= total_amount);

-- ---------------------------------------------------------------------------
-- Replace complete_sale to support customer + credit debt
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_sale(text, text, text, uuid, jsonb, numeric);

CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number text,
  p_payment_type text,
  p_status text,
  p_cashier_id uuid,
  p_items jsonb,
  p_discount numeric DEFAULT 0,
  p_customer_id uuid DEFAULT NULL
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
    p_invoice_number,
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

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_sale(
  text, text, text, uuid, jsonb, numeric, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_sale(
  text, text, text, uuid, jsonb, numeric, uuid
) TO authenticated;
