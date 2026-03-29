-- Migration: Add email column to staff table with uniqueness constraint
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
