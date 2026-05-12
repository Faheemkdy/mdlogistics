-- Migration to add location_rates table
CREATE TABLE IF NOT EXISTS public.location_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_name TEXT UNIQUE NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.location_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read rates
CREATE POLICY "Allow authenticated read access" ON public.location_rates
    FOR SELECT TO authenticated USING (true);

-- Allow admins to manage rates
CREATE POLICY "Allow admin manage access" ON public.location_rates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
