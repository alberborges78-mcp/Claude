-- Migration: 20261001000005_class_images_storage.sql
-- Create class-images storage bucket and policies

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'class-images',
    'class-images',
    true, -- public for reading
    5242880, -- 5 MB
    '{image/jpeg,image/png,image/webp}'::text[]
) ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;



-- 3. Public Read Policy
CREATE POLICY "Public read class-images" ON storage.objects
FOR SELECT
USING (bucket_id = 'class-images');

-- 4. Admin Insert Policy
CREATE POLICY "Admin insert class-images" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'class-images' AND
    EXISTS (
        SELECT 1 FROM public.admin_profiles 
        WHERE id = auth.uid() 
          AND role = 'admin' 
          AND is_active = true
    )
);

-- 5. Admin Update Policy
CREATE POLICY "Admin update class-images" ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'class-images' AND
    EXISTS (
        SELECT 1 FROM public.admin_profiles 
        WHERE id = auth.uid() 
          AND role = 'admin' 
          AND is_active = true
    )
);

-- 6. Admin Delete Policy
CREATE POLICY "Admin delete class-images" ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'class-images' AND
    EXISTS (
        SELECT 1 FROM public.admin_profiles 
        WHERE id = auth.uid() 
          AND role = 'admin' 
          AND is_active = true
    )
);
