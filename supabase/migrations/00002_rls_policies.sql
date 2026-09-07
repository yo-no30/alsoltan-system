-- Row Level Security policies for Sultan Beverages POS
-- Roles: admin (full access), cashier (POS-scoped access)

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: resolve current user's role from profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_auth_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "cashier_select_profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() = 'cashier');

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "cashier_select_categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() = 'cashier');

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "cashier_select_products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() = 'cashier');

-- ---------------------------------------------------------------------------
-- suppliers (admin only — cashiers have no access)
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_suppliers"
  ON public.suppliers
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_sales"
  ON public.sales
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "cashier_insert_sales"
  ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_auth_role() = 'cashier'
    AND cashier_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- sale_items
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_sale_items"
  ON public.sale_items
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "cashier_insert_sale_items"
  ON public.sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_auth_role() = 'cashier'
    AND EXISTS (
      SELECT 1
      FROM public.sales s
      WHERE s.id = sale_id
        AND s.cashier_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- purchases (admin only — cashiers have no access)
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_purchases"
  ON public.purchases
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- purchase_items (admin only — cashiers have no access)
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_full_access_purchase_items"
  ON public.purchase_items
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');
