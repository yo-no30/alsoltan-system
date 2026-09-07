-- Initial schema for Sultan Beverages POS & Management System
-- Tables: profiles, categories, products, suppliers, sales, sale_items, purchases, purchase_items

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'cashier'))
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_unique UNIQUE (name)
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barcode text,
  price numeric(10, 2) NOT NULL,
  cost_price numeric(10, 2) NOT NULL,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock_alert integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_barcode_unique UNIQUE (barcode),
  CONSTRAINT products_price_non_negative CHECK (price >= 0),
  CONSTRAINT products_cost_price_non_negative CHECK (cost_price >= 0)
);

CREATE INDEX products_category_id_idx ON public.products (category_id);
CREATE INDEX products_barcode_idx ON public.products (barcode);
CREATE INDEX products_is_active_idx ON public.products (is_active);

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  balance_due numeric(10, 2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  cashier_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  total_amount numeric(10, 2) NOT NULL,
  payment_type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_invoice_number_unique UNIQUE (invoice_number),
  CONSTRAINT sales_payment_type_check CHECK (payment_type IN ('cash', 'card')),
  CONSTRAINT sales_status_check CHECK (status IN ('completed', 'synced_offline'))
);

CREATE INDEX sales_cashier_id_idx ON public.sales (cashier_id);
CREATE INDEX sales_invoice_number_idx ON public.sales (invoice_number);
CREATE INDEX sales_created_at_idx ON public.sales (created_at DESC);

-- ---------------------------------------------------------------------------
-- sale_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  total_price numeric(10, 2) NOT NULL,
  CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX sale_items_sale_id_idx ON public.sale_items (sale_id);
CREATE INDEX sale_items_product_id_idx ON public.sale_items (product_id);

-- ---------------------------------------------------------------------------
-- purchases
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  total_amount numeric(10, 2) NOT NULL,
  paid_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
  payment_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_payment_type_check CHECK (payment_type IN ('cash', 'credit'))
);

CREATE INDEX purchases_supplier_id_idx ON public.purchases (supplier_id);
CREATE INDEX purchases_created_at_idx ON public.purchases (created_at DESC);

-- ---------------------------------------------------------------------------
-- purchase_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  cost_price numeric(10, 2) NOT NULL,
  CONSTRAINT purchase_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX purchase_items_purchase_id_idx ON public.purchase_items (purchase_id);
CREATE INDEX purchase_items_product_id_idx ON public.purchase_items (product_id);
