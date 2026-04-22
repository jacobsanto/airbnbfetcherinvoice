-- Create private PDF storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    false,
    52428800,  -- 50MB per file
    ARRAY['application/pdf']
);

-- Users can only access files under their own user_id folder
CREATE POLICY "invoices_storage_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "invoices_storage_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "invoices_storage_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Debug bucket for scraper screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'debug',
    'debug',
    false,
    10485760,  -- 10MB
    ARRAY['image/png', 'image/jpeg']
);

CREATE POLICY "debug_storage_service_role_only" ON storage.objects
    FOR ALL USING (bucket_id = 'debug');
