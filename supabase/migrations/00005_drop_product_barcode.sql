-- Remove product barcode (unused)

DROP INDEX IF EXISTS public.products_barcode_idx;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_barcode_unique;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS barcode;
