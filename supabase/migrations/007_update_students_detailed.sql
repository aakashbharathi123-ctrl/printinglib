-- Migration: Add detailed columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS surname TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT;

-- Update existing records if needed (optional)
-- UPDATE students SET surname = '', email = '', mobile = '' WHERE surname IS NULL;
