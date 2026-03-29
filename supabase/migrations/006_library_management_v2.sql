-- Migration to Library Management V2 (Admin-Only)

-- Function to update the updated_at timestamp on record changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC: Update Overdue Status & Apply Fines
CREATE OR REPLACE FUNCTION update_overdue_loans()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mark transactions as OVERDUE and apply ₹500 fine
  -- Only if current date > due_date and still ACTIVE
  UPDATE transactions
  SET 
    status = 'OVERDUE',
    fine_amount = 500
  WHERE 
    status = 'ACTIVE' 
    AND due_date < NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Create Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reg_no TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  borrow_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'OVERDUE', 'RETURNED')) DEFAULT 'ACTIVE',
  fine_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Migrate existing students from profiles
-- Use COALESCE for name and reg_no to handle users with missing data
INSERT INTO students (id, name, reg_no, created_at)
SELECT 
  id, 
  COALESCE(full_name, 'Unknown Student'), 
  COALESCE(registered_number, 'TEMP_' || id::text), 
  created_at
FROM profiles
WHERE role = 'student'
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  reg_no = EXCLUDED.reg_no;

-- 5. Migrate existing loans to transactions
-- Note: existing loans don't have staff_id, so we'll leave it null initially
INSERT INTO transactions (id, student_id, book_id, borrow_date, due_date, returned_at, status, created_at)
SELECT l.id, l.user_id, l.book_id, l.borrowed_at, l.due_at, l.returned_at, 
  CASE 
    WHEN l.status = 'BORROWED' THEN 'ACTIVE'
    WHEN l.status = 'RETURNED' THEN 'RETURNED'
    WHEN l.status = 'OVERDUE' THEN 'OVERDUE'
    ELSE 'ACTIVE'
  END,
  l.created_at
FROM loans l
JOIN students s ON l.user_id = s.id;

-- 6. Add triggers for updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RPC Functions for Book Management

-- Function to decrement available copies
CREATE OR REPLACE FUNCTION decrement_available_copies(p_book_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE books
  SET available_copies = available_copies - 1
  WHERE id = p_book_id AND available_copies > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment available copies
CREATE OR REPLACE FUNCTION increment_available_copies(p_book_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE books
  SET available_copies = available_copies + 1
  WHERE id = p_book_id AND available_copies < total_copies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Storage Bucket Note: Create 'book-images' bucket in Supabase dashboard
