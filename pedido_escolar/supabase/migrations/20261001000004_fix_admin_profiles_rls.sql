-- Fix RLS and permissions for admin_profiles

-- 1. Garantir RLS habilitado em public.admin_profiles
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover a policy insegura existente
DROP POLICY IF EXISTS "Admin full admin_profiles" ON public.admin_profiles;

-- 3. Conceder SOMENTE SELECT ao role authenticated
GRANT SELECT ON TABLE public.admin_profiles TO authenticated;

-- 4. Criar policy para usuário autenticado ler SOMENTE o próprio perfil
CREATE POLICY "Admin select own profile"
ON public.admin_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
