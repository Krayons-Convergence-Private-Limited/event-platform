-- Create the event-media storage bucket for badges and email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-media', 'event-media', true, 10485760, NULL); -- 10MB limit, all file types

-- Allow authenticated users to upload media files 
CREATE POLICY "Allow authenticated users to upload media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-media' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to media files
CREATE POLICY "Allow public read access to media" ON storage.objects
FOR SELECT USING (bucket_id = 'event-media');

-- Allow users to update their own uploaded media
CREATE POLICY "Allow users to update their media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-media' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own uploaded media
CREATE POLICY "Allow users to delete their media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-media' 
  AND auth.role() = 'authenticated'
);

-- Ensure events table has the required columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_media_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS badge_template_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_body TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_template_variables JSONB DEFAULT '{}';