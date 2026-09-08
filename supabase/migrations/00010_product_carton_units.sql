-- Pack size for carton/piece inventory display.
-- stock_quantity remains the source of truth in individual pieces.
-- Example: 5 cartons × 20 pcs = 100 stock_quantity; sell 2 → 98 → 4 cartons + 18 pcs.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pieces_per_carton integer NOT NULL DEFAULT 1;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_pieces_per_carton_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_pieces_per_carton_check
  CHECK (pieces_per_carton >= 1);

COMMENT ON COLUMN public.products.pieces_per_carton IS
  'Number of sellable pieces in one carton. stock_quantity is always stored in pieces.';
