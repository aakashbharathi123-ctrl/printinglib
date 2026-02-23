-- Row Level Security Policies
-- Run this after 001_schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DEPARTMENTS POLICIES
-- ============================================
-- Everyone authenticated can read departments
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage departments
CREATE POLICY "Admins can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent users from changing their own role
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Allow profile creation for new users (handled by trigger, but also allow service role)
CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- BOOKS POLICIES
-- ============================================
-- Everyone authenticated can view active books
CREATE POLICY "Authenticated users can view active books"
  ON books FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin(auth.uid()));

-- Only admins can insert books
CREATE POLICY "Admins can insert books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update books
CREATE POLICY "Admins can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete books
CREATE POLICY "Admins can delete books"
  ON books FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================
-- LOANS POLICIES
-- ============================================
-- Users can view their own loans
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all loans
CREATE POLICY "Admins can view all loans"
  ON loans FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Loans are created via server action (service role), but allow policy for reference
CREATE POLICY "Users can create own loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Loans can be updated (for returns) by owner or admin
CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any loan"
  ON loans FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- SETTINGS POLICIES
-- ============================================
-- Only admins can view settings
CREATE POLICY "Admins can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Allow service role to initialize settings
CREATE POLICY "Allow settings initialization"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- ADMIN AUDIT LOGS POLICIES
-- ============================================
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Audit logs are inserted via service role (server actions)
-- This policy allows admins to insert directly if needed
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));
