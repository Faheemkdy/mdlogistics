-- Table to store global application settings like Theme Color and Design Style
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_color TEXT NOT NULL DEFAULT 'blue',
    design_style TEXT NOT NULL DEFAULT 'modern',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- We only ever need one row. Insert a default row if it doesn't exist.
INSERT INTO public.app_settings (id, theme_color, design_style)
SELECT '00000000-0000-0000-0000-000000000001', 'blue', 'modern'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings LIMIT 1);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view settings
CREATE POLICY "Anyone can view app settings"
    ON public.app_settings FOR SELECT
    USING (true);

-- Policy: Only Master Admin can update settings
-- Assuming Master Admin is identifiable by the username 'md' in profiles table
CREATE POLICY "Only Master Admin can update app settings"
    ON public.app_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.username = 'md'
        )
    );

-- Trigger to auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
