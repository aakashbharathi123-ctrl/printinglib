-- Database Functions for Business Logic
-- Run this after 002_rls_policies.sql

-- ============================================
-- BORROW BOOK FUNCTION (Atomic Transaction)
-- ============================================
CREATE OR REPLACE FUNCTION borrow_book(
  p_user_id UUID,
  p_book_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_settings RECORD;
  v_book RECORD;
  v_active_loans INT;
  v_loan_id UUID;
  v_due_at TIMESTAMPTZ;
BEGIN
  -- Get settings
  SELECT * INTO v_settings FROM settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Settings not configured');
  END IF;

  -- Get book info with lock
  SELECT * INTO v_book FROM books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Book not found');
  END IF;

  -- Check if book is active
  IF NOT v_book.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Book is not available');
  END IF;

  -- Check available copies
  IF v_book.available_copies <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No copies available');
  END IF;

  -- Check user's active loans count
  SELECT COUNT(*) INTO v_active_loans 
  FROM loans 
  WHERE user_id = p_user_id AND status = 'BORROWED';

  IF v_active_loans >= v_settings.max_books_per_student THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('Borrow limit reached. Maximum %s books allowed.', v_settings.max_books_per_student)
    );
  END IF;

  -- Check if user already has this book borrowed
  IF EXISTS (
    SELECT 1 FROM loans 
    WHERE user_id = p_user_id 
    AND book_id = p_book_id 
    AND status = 'BORROWED'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You already have this book borrowed');
  END IF;

  -- Calculate due date
  v_due_at := NOW() + (v_settings.default_loan_days || ' days')::INTERVAL;

  -- Create loan record
  INSERT INTO loans (user_id, book_id, due_at, status, created_by)
  VALUES (p_user_id, p_book_id, v_due_at, 'BORROWED', p_created_by)
  RETURNING id INTO v_loan_id;

  -- Decrement available copies
  UPDATE books 
  SET available_copies = available_copies - 1
  WHERE id = p_book_id;

  RETURN json_build_object(
    'success', true, 
    'loan_id', v_loan_id,
    'due_at', v_due_at,
    'message', 'Book borrowed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RETURN BOOK FUNCTION (Atomic Transaction)
-- ============================================
CREATE OR REPLACE FUNCTION return_book(
  p_loan_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_loan RECORD;
  v_is_late BOOLEAN;
BEGIN
  -- Get loan with lock
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Loan not found');
  END IF;

  -- If user_id provided, verify ownership (unless admin action)
  IF p_user_id IS NOT NULL AND v_loan.user_id != p_user_id THEN
    -- Check if caller is admin
    IF NOT is_admin(p_user_id) THEN
      RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;
  END IF;

  -- Check if already returned
  IF v_loan.status = 'RETURNED' THEN
    RETURN json_build_object('success', false, 'error', 'Book already returned');
  END IF;

  -- Check if late
  v_is_late := NOW() > v_loan.due_at;

  -- Update loan
  UPDATE loans 
  SET 
    returned_at = NOW(),
    status = 'RETURNED'
  WHERE id = p_loan_id;

  -- Increment available copies
  UPDATE books 
  SET available_copies = available_copies + 1
  WHERE id = v_loan.book_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Book returned successfully',
    'was_late', v_is_late
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RENEW BOOK FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION renew_book(
  p_loan_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_settings RECORD;
  v_loan RECORD;
  v_new_due_at TIMESTAMPTZ;
BEGIN
  -- Get settings
  SELECT * INTO v_settings FROM settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Settings not configured');
  END IF;

  -- Check if renewals are allowed
  IF NOT v_settings.allow_renewals THEN
    RETURN json_build_object('success', false, 'error', 'Renewals are not allowed');
  END IF;

  -- Get loan with lock
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Loan not found');
  END IF;

  -- Verify ownership (unless admin)
  IF v_loan.user_id != p_user_id AND NOT is_admin(p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if already returned
  IF v_loan.status = 'RETURNED' THEN
    RETURN json_build_object('success', false, 'error', 'Book already returned');
  END IF;

  -- Check renewal limit
  IF v_loan.renew_count >= v_settings.max_renewals THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('Maximum renewals (%s) reached', v_settings.max_renewals)
    );
  END IF;

  -- Calculate new due date from current due date
  v_new_due_at := v_loan.due_at + (v_settings.default_loan_days || ' days')::INTERVAL;

  -- Update loan
  UPDATE loans 
  SET 
    due_at = v_new_due_at,
    renew_count = renew_count + 1,
    status = 'BORROWED'  -- Reset status if was overdue
  WHERE id = p_loan_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Book renewed successfully',
    'new_due_at', v_new_due_at,
    'renewals_remaining', v_settings.max_renewals - v_loan.renew_count - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE OVERDUE LOANS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_overdue_loans()
RETURNS INT AS $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE loans 
  SET status = 'OVERDUE'
  WHERE status = 'BORROWED' 
  AND due_at < NOW()
  AND returned_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET LIBRARY STATS FUNCTION (for dashboard)
-- ============================================
CREATE OR REPLACE FUNCTION get_library_stats()
RETURNS JSON AS $$
DECLARE
  v_total_books INT;
  v_total_copies INT;
  v_available_copies INT;
  v_active_loans INT;
  v_overdue_loans INT;
  v_total_students INT;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_copies), 0),
    COALESCE(SUM(available_copies), 0)
  INTO v_total_books, v_total_copies, v_available_copies
  FROM books WHERE is_active = true;

  SELECT COUNT(*) INTO v_active_loans 
  FROM loans WHERE status = 'BORROWED';

  SELECT COUNT(*) INTO v_overdue_loans 
  FROM loans WHERE status = 'OVERDUE' OR (status = 'BORROWED' AND due_at < NOW());

  SELECT COUNT(*) INTO v_total_students 
  FROM profiles WHERE role = 'student';

  RETURN json_build_object(
    'total_books', v_total_books,
    'total_copies', v_total_copies,
    'available_copies', v_available_copies,
    'active_loans', v_active_loans,
    'overdue_loans', v_overdue_loans,
    'total_students', v_total_students
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN LOG ACTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_logs (admin_id, action, metadata)
  VALUES (p_admin_id, p_action, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
