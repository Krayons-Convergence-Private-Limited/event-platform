-- Create the event-banners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true);

-- Allow authenticated users to upload files to their own organization's folder
CREATE POLICY "Allow authenticated users to upload banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-banners' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read all banner files (since they're public)
CREATE POLICY "Allow public read access to banners" ON storage.objects
FOR SELECT USING (bucket_id = 'event-banners');

-- Allow users to update their own uploaded banners
CREATE POLICY "Allow users to update their banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-banners' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own uploaded banners
CREATE POLICY "Allow users to delete their banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-banners' 
  AND auth.role() = 'authenticated'
);