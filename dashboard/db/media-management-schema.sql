-- Media Management Schema for Banners, Badges, and Email Templates

-- Add new columns to events table for media management
ALTER TABLE events ADD COLUMN IF NOT EXISTS badge_template_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_media_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_body TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS email_template_variables JSONB DEFAULT '{}';

-- Create media_assets table for storing uploaded media
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NULL,
    media_type VARCHAR(50) NOT NULL, -- 'banner', 'badge', 'email_attachment'
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

-- Create email_templates table for predefined templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    template_variables JSONB DEFAULT '{}', -- Available placeholders
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (template_name, subject_template, body_template, template_variables, is_default) VALUES 
(
    'India Expo Shop Template',
    'Fwd: INDIAEXPOSHOP 2025 Registration Confirmation',
    'Registration Confirmation

Dear {{user_name}},

Your Registration ID: {{registration_id}}

Greetings from {{event_name}}!

Thank you for registering for the {{event_name}}.

We''re excited to see you at the premier platform for events and exhibitions.

Event Details:
Date: {{event_date}}
Venue: {{event_location}}

{{qr_code_placeholder}}

Thanks & Regards
{{event_name}} Team',
    '{"user_name": "User Name", "registration_id": "Registration ID", "event_name": "Event Name", "event_date": "Event Date", "event_location": "Event Location", "qr_code_placeholder": "QR Code"}',
    true
),
(
    'Gartex Template',
    'Your registration for {{event_name}} is successful',
    'Dear {{user_name}},

Thank you for registering to visit {{event_name}} from {{event_date}} at {{event_location}}.

Attached is your e-badge to visit the show.

Carry a print out of your E-badge to the show for direct entry.

Opening Hours:
{{event_date}} 10:00 am – 6:00 pm

Venue:
{{event_location}}

For enquiries, contact: {{contact_info}}

{{qr_code_placeholder}}

*E-badge/Mobile badges are not acceptable for direct hall entry.
*Entry for business visitors above 16 years of age only

Have a safe and fruitful networking!

See you at {{event_name}}!

Best Regards,
Team {{event_name}}',
    '{"user_name": "User Name", "event_name": "Event Name", "event_date": "Event Date", "event_location": "Event Location", "contact_info": "Contact Information", "qr_code_placeholder": "QR Code"}',
    true
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_assets_event_id ON media_assets(event_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id);

-- Add RLS policies for media_assets
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own media assets" ON media_assets
    FOR SELECT USING (organization_id = auth.uid());

CREATE POLICY "Users can insert their own media assets" ON media_assets
    FOR INSERT WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Users can update their own media assets" ON media_assets
    FOR UPDATE USING (organization_id = auth.uid());

CREATE POLICY "Users can delete their own media assets" ON media_assets
    FOR DELETE USING (organization_id = auth.uid());

-- Add RLS policies for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email templates" ON email_templates
    FOR SELECT USING (organization_id = auth.uid() OR is_default = true);

CREATE POLICY "Users can insert their own email templates" ON email_templates
    FOR INSERT WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Users can update their own email templates" ON email_templates
    FOR UPDATE USING (organization_id = auth.uid());

CREATE POLICY "Users can delete their own email templates" ON email_templates
    FOR DELETE USING (organization_id = auth.uid());

-- Update existing events table to have proper defaults
UPDATE events SET 
    email_subject = 'Registration Confirmation for {{event_name}}',
    email_body = 'Dear {{user_name}},\n\nThank you for registering for {{event_name}}.\n\nYour Registration ID: {{registration_id}}\n\nEvent Details:\nDate: {{event_date}}\nVenue: {{event_location}}\n\n{{qr_code_placeholder}}\n\nBest Regards,\n{{event_name}} Team'
WHERE email_subject IS NULL OR email_body IS NULL;