-- Add item_number column to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS item_number text;
