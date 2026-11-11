-- ============================================================================
-- SCHEMA DATABASE & AUTH RLS SUPABASE (POSTGRESQL) — CV BANONG FARMS POS
-- Jalankan script SQL ini di menu "SQL Editor" pada Dashboard Supabase Anda
-- ============================================================================

-- 0. Schema Privat untuk Fungsi Helper Keamanan (Non-Exposed Schema)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 1. Tabel Profil & Role Staf (Terhubung ke Supabase Auth `auth.users`)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Staf Kasir',
  role TEXT NOT NULL DEFAULT 'CASHIER' CHECK (role IN ('CASHIER', 'OWNER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Fungsi Helper di Schema `private` untuk Cek Role OWNER
-- (Menggunakan `(select auth.uid())` agar di-cache sekali per query oleh planner Postgres)
CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'OWNER'
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_owner() TO authenticated, service_role;

-- Trigger Otomatis Konfirmasi Email Tanpa Perlu Buka Inbox (`email_confirmed_at = NOW()`)
CREATE OR REPLACE FUNCTION private.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.auto_confirm_user_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.auto_confirm_user_email();

-- Konfirmasi otomatis semua akun yang sudah telanjur mendaftar sebelumnya
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Trigger Otomatis Membuat Baris `public.profiles` Saat User Sign Up di `auth.users`
-- Catatan Keamanan: Role default adalah 'CASHIER' kecuali akun pertama di toko (bootstrap OWNER)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_first_user BOOLEAN;
  initial_role TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

  IF is_first_user THEN
    initial_role := 'OWNER';
  ELSE
    initial_role := 'CASHIER';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Staf CV Banong Farms'),
    initial_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 2. Tabel Katalog Produk Pakan (Grosir & Eceran)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  wholesale_price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '1 Kg',
  cost_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel Riwayat Transaksi Penjualan
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cashier_name TEXT NOT NULL,
  waiter_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  table_number TEXT NOT NULL,
  order_type TEXT NOT NULL,
  global_note TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_discount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  change_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

-- 4. Tabel Nota Tersimpan Sementara (Hold / Pending Orders)
CREATE TABLE IF NOT EXISTS public.held_orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  waiter_name TEXT NOT NULL,
  table_number TEXT NOT NULL,
  order_type TEXT NOT NULL,
  global_note TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_held_orders_created_by ON public.held_orders(created_by);

-- ============================================================================
-- 5. DATA API GRANTS & ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.held_orders TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.held_orders ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Allow public POS access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public POS access on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow public POS access on held_orders" ON public.held_orders;

-- Policies untuk `public.profiles`
DROP POLICY IF EXISTS "profiles_select_own_or_owner" ON public.profiles;
CREATE POLICY "profiles_select_own_or_owner"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT private.is_owner())
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role = 'CASHIER'
  );

DROP POLICY IF EXISTS "profiles_update_own_or_owner" ON public.profiles;
CREATE POLICY "profiles_update_own_or_owner"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT private.is_owner())
  )
  WITH CHECK (
    (SELECT private.is_owner())
    OR (
      (SELECT auth.uid()) = id
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    )
  );

-- Policies untuk `public.products` (Staf terautentikasi dapat melihat & sinkronisasi stok)
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "products_insert_authenticated" ON public.products;
CREATE POLICY "products_insert_authenticated"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "products_update_authenticated" ON public.products;
CREATE POLICY "products_update_authenticated"
  ON public.products FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "products_delete_owner_only" ON public.products;
CREATE POLICY "products_delete_owner_only"
  ON public.products FOR DELETE
  TO authenticated
  USING ((SELECT private.is_owner()));

-- Policies untuk `public.transactions`
DROP POLICY IF EXISTS "transactions_select_authenticated" ON public.transactions;
CREATE POLICY "transactions_select_authenticated"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = created_by
    OR created_by IS NULL
    OR (SELECT private.is_owner())
  );

DROP POLICY IF EXISTS "transactions_insert_authenticated" ON public.transactions;
CREATE POLICY "transactions_insert_authenticated"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (created_by IS NULL OR created_by = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "transactions_update_authenticated" ON public.transactions;
CREATE POLICY "transactions_update_authenticated"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = created_by
    OR created_by IS NULL
    OR (SELECT private.is_owner())
  )
  WITH CHECK (
    (SELECT auth.uid()) = created_by
    OR created_by IS NULL
    OR (SELECT private.is_owner())
  );

-- Policies untuk `public.held_orders`
DROP POLICY IF EXISTS "held_orders_select_authenticated" ON public.held_orders;
CREATE POLICY "held_orders_select_authenticated"
  ON public.held_orders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "held_orders_insert_authenticated" ON public.held_orders;
CREATE POLICY "held_orders_insert_authenticated"
  ON public.held_orders FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "held_orders_update_authenticated" ON public.held_orders;
CREATE POLICY "held_orders_update_authenticated"
  ON public.held_orders FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "held_orders_delete_authenticated" ON public.held_orders;
CREATE POLICY "held_orders_delete_authenticated"
  ON public.held_orders FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- 6. DATA SEEDING: AKUN ADMINISTRATOR & KASIR RESMI CV BANONG FARMS
-- Jalankan query ini di Supabase SQL Editor untuk mendaftarkan akun Admin & Kasir
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6.0 Perbaiki nilai NULL pada kolom token GoTrue Supabase Auth
-- (PENTING: GoTrue/Supabase Auth ditulis dalam Go dan akan error 500
-- "Database error querying schema" jika kolom token ini bernilai NULL)
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change IS NULL 
  OR email_change_token_new IS NULL;

-- 6.1 Daftarkan akun Administrator Utama (admin@banongfarms.id / Sandi: admin123)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@banongfarms.id';

  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@banongfarms.id',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"],"role":"OWNER"}'::jsonb,
      '{"full_name":"Administrator CV Banong"}'::jsonb,
      false,
      NOW(),
      NOW()
    );
  ELSE
    -- Pastikan token tidak bernilai NULL
    UPDATE auth.users
    SET 
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      encrypted_password = crypt('admin123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = admin_user_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    admin_user_id,
    'admin@banongfarms.id',
    'Administrator CV Banong',
    'OWNER',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET role = 'OWNER', full_name = 'Administrator CV Banong';
END $$;

-- 6.2 Perbarui akun kasir@gmai.com agar memiliki role CASHIER (Kasir)
UPDATE public.profiles
SET role = 'CASHIER'
WHERE email = 'kasir@gmai.com';

