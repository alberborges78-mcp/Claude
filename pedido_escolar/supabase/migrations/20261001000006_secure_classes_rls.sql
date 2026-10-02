-- Migration: 20261001000006_secure_classes_rls.sql
-- Secure RLS on public.classes for admin operations

-- 1. Ensure RLS is enabled
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all previous direct access to ensure a clean state
REVOKE ALL ON public.classes FROM anon;
REVOKE ALL ON public.classes FROM authenticated;

-- 3. Grant specific safe privileges
GRANT SELECT ON public.classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;

-- 4. Drop the overly permissive admin policy
DROP POLICY IF EXISTS "Admin full classes" ON public.classes;

-- Note: We are preserving "Public read active classes" which is FOR SELECT TO anon USING (is_active = true)

-- 5. Admin Select Policy (Allow authenticated admins to read all classes, even inactive)
CREATE POLICY "Admin select classes" ON public.classes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.role = 'admin'
          AND ap.is_active = true
    )
);

-- 6. Admin Insert Policy
CREATE POLICY "Admin insert classes" ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.role = 'admin'
          AND ap.is_active = true
    )
);

-- 7. Admin Update Policy
CREATE POLICY "Admin update classes" ON public.classes
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.role = 'admin'
          AND ap.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.role = 'admin'
          AND ap.is_active = true
    )
);

-- 8. Admin Delete Policy
CREATE POLICY "Admin delete classes" ON public.classes
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.role = 'admin'
          AND ap.is_active = true
    )
);
