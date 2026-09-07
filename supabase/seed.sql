-- =============================================================================
-- مشروبات السلطان — Seed: إنشاء ملف المدير الأولي
-- Sultan Beverages — Seed initial admin profile
-- =============================================================================
--
-- التعليمات / Instructions:
-- 1) من لوحة Supabase: Authentication → Users → Add user
--    Create a user with Email + Password (confirm email if required).
-- 2) انسخ UUID الخاص بالمستخدم من عمود User UID.
-- 3) استبدل <AUTH_USER_UUID> أدناه ثم نفّذ هذا الملف في SQL Editor.
--
-- 1) Supabase Dashboard → Authentication → Users → Add user
-- 2) Copy the user's UUID
-- 3) Replace <AUTH_USER_UUID> below and run this script in the SQL Editor
--
-- =============================================================================

INSERT INTO public.profiles (id, full_name, role)
VALUES (
  '<AUTH_USER_UUID>',  -- مثال: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  'مدير النظام',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- -----------------------------------------------------------------------------
-- اختياري: إضافة كاشير للاختبار
-- Optional: seed a cashier profile (create Auth user first, then uncomment)
-- -----------------------------------------------------------------------------
-- INSERT INTO public.profiles (id, full_name, role)
-- VALUES (
--   '<CASHIER_AUTH_USER_UUID>',
--   'كاشير الفرع',
--   'cashier'
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET
--   full_name = EXCLUDED.full_name,
--   role = EXCLUDED.role;
