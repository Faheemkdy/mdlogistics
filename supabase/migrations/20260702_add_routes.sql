-- Drop the previous incorrect table if it was created
DROP TABLE IF EXISTS route_shops;

-- Create routes table (if not exists)
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create route_locations table for ordering locations in a route
CREATE TABLE IF NOT EXISTS route_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(route_id, location_name)
);

-- Enable RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_locations ENABLE ROW LEVEL SECURITY;

-- Policies for routes
CREATE POLICY "Enable read access for all authenticated users" ON routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admin users" ON routes FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Policies for route_locations
CREATE POLICY "Enable read access for all authenticated users" ON route_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admin users" ON route_locations FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
