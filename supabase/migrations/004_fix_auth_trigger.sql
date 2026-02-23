-- ============================================
-- FIX: Robust User Creation Trigger
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create a more robust trigger function that handles conflicts and errors
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'student' -- Default role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error to Postgres logs but ensure auth user creation succeeds
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop and recreate the trigger to ensure it's using the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 3. Ensure Departments exist (to prevent FK errors if you manually update profiles later)
INSERT INTO public.departments (id, name) VALUES
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

-- 4. Ensure Settings exist
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
