-- Seed Data for Library Management System
-- Run this after all migrations

-- ============================================
-- SEED DEPARTMENTS
-- ============================================
INSERT INTO departments (id, name) VALUES
  ('CSE', 'Computer Science and Engineering'),
  ('ECE', 'Electronics and Communication Engineering'),
  ('EEE', 'Electrical and Electronics Engineering'),
  ('MECH', 'Mechanical Engineering'),
  ('CIVIL', 'Civil Engineering'),
  ('IT', 'Information Technology'),
  ('AIDS', 'Artificial Intelligence and Data Science'),
  ('CSBS', 'Computer Science and Business Systems'),
  ('MBA', 'Master of Business Administration'),
  ('MCA', 'Master of Computer Applications')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED SETTINGS (Single Row)
-- ============================================
INSERT INTO settings (id, max_books_per_student, default_loan_days, fine_per_day, allow_renewals, max_renewals)
VALUES (1, 2, 7, 0, true, 1)
ON CONFLICT (id) DO UPDATE SET
  max_books_per_student = EXCLUDED.max_books_per_student,
  default_loan_days = EXCLUDED.default_loan_days,
  fine_per_day = EXCLUDED.fine_per_day,
  allow_renewals = EXCLUDED.allow_renewals,
  max_renewals = EXCLUDED.max_renewals;

-- ============================================
-- SEED SAMPLE BOOKS
-- ============================================
INSERT INTO books (book_id, title, author, category, total_copies, available_copies, image_url) VALUES
  ('ISBN-001', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 5, 5, 'https://images-na.ssl-images-amazon.com/images/I/41SNoh5ZhOL._SX379_BO1,204,203,200_.jpg'),
  ('ISBN-002', 'Clean Code', 'Robert C. Martin', 'Software Engineering', 3, 3, 'https://images-na.ssl-images-amazon.com/images/I/41xShlnTZTL._SX376_BO1,204,203,200_.jpg'),
  ('ISBN-003', 'Design Patterns', 'Gang of Four', 'Software Engineering', 2, 2, 'https://images-na.ssl-images-amazon.com/images/I/51szD9HC9pL._SX395_BO1,204,203,200_.jpg'),
  ('ISBN-004', 'The Pragmatic Programmer', 'David Thomas, Andrew Hunt', 'Software Engineering', 4, 4, 'https://images-na.ssl-images-amazon.com/images/I/51cUVaBWZzL._SX380_BO1,204,203,200_.jpg'),
  ('ISBN-005', 'Database System Concepts', 'Abraham Silberschatz', 'Database', 3, 3, 'https://images-na.ssl-images-amazon.com/images/I/51YwqN2eObL._SX258_BO1,204,203,200_.jpg'),
  ('ISBN-006', 'Computer Networks', 'Andrew S. Tanenbaum', 'Networking', 4, 4, 'https://images-na.ssl-images-amazon.com/images/I/41Ain8+kKkL._SX350_BO1,204,203,200_.jpg'),
  ('ISBN-007', 'Operating System Concepts', 'Abraham Silberschatz', 'Operating Systems', 5, 5, 'https://images-na.ssl-images-amazon.com/images/I/51Qy2upM+aL._SX387_BO1,204,203,200_.jpg'),
  ('ISBN-008', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Artificial Intelligence', 3, 3, 'https://images-na.ssl-images-amazon.com/images/I/51xwGSNKqEL._SX380_BO1,204,203,200_.jpg'),
  ('ISBN-009', 'Deep Learning', 'Ian Goodfellow', 'Machine Learning', 2, 2, 'https://images-na.ssl-images-amazon.com/images/I/61fim5QqaqL._SX382_BO1,204,203,200_.jpg'),
  ('ISBN-010', 'Python Crash Course', 'Eric Matthes', 'Programming', 6, 6, 'https://images-na.ssl-images-amazon.com/images/I/51Fkt4X7qBL._SX376_BO1,204,203,200_.jpg')
ON CONFLICT (book_id) DO NOTHING;

-- ============================================
-- SAMPLE USER ACCOUNTS SETUP
-- ============================================
-- Since Supabase Auth handles user creation, you need to:
-- 1. Create users via Supabase Dashboard > Authentication > Users > Add User
-- 2. Then run the SQL below to set up their profiles

-- STEP 1: Create these users in Supabase Dashboard (Authentication > Users > Add User):
--   Admin: admin@lib.com / admin@pass
--   Student: student@lib.com / student@pass

-- STEP 2: After creating users, get their UUIDs from the dashboard and run:

-- Option A: If you know the UUIDs (replace with actual UUIDs from dashboard)
-- INSERT INTO profiles (id, email, full_name, role, registered_number, department_id) VALUES
--   ('admin-uuid-here', 'admin@lib.com', 'Library Admin', 'admin', NULL, NULL),
--   ('student-uuid-here', 'student@lib.com', 'Demo Student', 'student', 'STU001', 'CSE')
-- ON CONFLICT (id) DO UPDATE SET
--   role = EXCLUDED.role,
--   full_name = EXCLUDED.full_name;

-- Option B: Update existing profiles by email (simpler - run after users sign in once)
UPDATE profiles SET 
  role = 'admin', 
  full_name = 'Library Admin' 
WHERE email = 'admin@lib.com';

UPDATE profiles SET 
  role = 'student', 
  full_name = 'Demo Student',
  registered_number = 'STU001',
  department_id = 'CSE'
WHERE email = 'student@lib.com';

-- ============================================
-- VERIFY SAMPLE USERS
-- ============================================
-- SELECT id, email, role, full_name, registered_number FROM profiles;
