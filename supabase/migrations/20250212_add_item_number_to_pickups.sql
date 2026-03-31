-- Add item_number to pickup_items table
ALTER TABLE pickup_items 
ADD COLUMN IF NOT EXISTS item_number text;

-- Refresh the schema cache
NOTIFY pgrst, 'reload config';
