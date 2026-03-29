// @ts-nocheck
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSettings(settings: {
    max_books_per_student?: number
    default_loan_days?: number
    fine_per_day?: number
    allow_renewals?: boolean
    max_renewals?: number
}) {
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
    }

    const { data, error } = await adminSupabase
        .from('settings')
        .update(settings)
        .eq('id', 1)
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'SETTINGS_UPDATE',
        p_metadata: settings,
    })

    revalidatePath('/admin/settings')

    return { success: true, data }
}

export async function fetchAdminLoans(statusFilter?: string) {
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated', data: [] }
    }

    // Verify admin role
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'Admin access required', data: [] }
    }

    let query = adminSupabase
        .from('transactions')
        .select('*, books (*), students (*), staff (*)')
        .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

export async function fetchStudents() {
    const adminSupabase = await createAdminClient()
    const { data, error } = await adminSupabase
        .from('students')
        .select('*')
        .order('name', { ascending: true })

    if (error) return { success: false, error: error.message, data: [] }
    return { success: true, data: data || [] }
}

export async function bulkUploadStudents(students: { 
    name: string, 
    reg_no: string,
    surname?: string,
    email?: string,
    mobile?: string
}[]) {
    const adminSupabase = await createAdminClient()
    
    const { data, error } = await adminSupabase
        .from('students')
        .upsert(students, { onConflict: 'reg_no' })
        .select()

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/admin/students')
    return { success: true, count: data?.length || 0 }
}

export async function fetchStaff() {
    const adminSupabase = await createAdminClient()
    const { data, error } = await adminSupabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true })

    if (error) return { success: false, error: error.message, data: [] }
    return { success: true, data: data || [] }
}

export async function addStaff(name: string, email: string) {
    const adminSupabase = await createAdminClient()
    const { data, error } = await adminSupabase
        .from('staff')
        .insert({ name, email })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/staff')
    return { success: true, data }
}

export async function updateStaff(id: string, name: string, email: string) {
    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
        .from('staff')
        .update({ name, email })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/staff')
    return { success: true }
}

export async function bulkUploadStaff(staff: { name: string, email: string }[]) {
    const adminSupabase = await createAdminClient()
    
    // Upsert avoids duplicates based on the UNIQUE email constraint
    const { data, error } = await adminSupabase
        .from('staff')
        .upsert(staff, { onConflict: 'email' })
        .select()

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/admin/staff')
    return { success: true, count: data?.length || 0 }
}

export async function deleteStaff(id: string) {
    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
        .from('staff')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/staff')
    return { success: true }
}

export async function assignBook(params: {
    student_id: string,
    book_id: string,
    staff_id: string,
    due_date: string
}) {
    const adminSupabase = await createAdminClient()
    
    // Check if book is available
    const { data: book } = await adminSupabase
        .from('books')
        .select('available_copies')
        .eq('id', params.book_id)
        .single()

    if (!book || book.available_copies <= 0) {
        return { success: false, error: 'Book not available' }
    }

    // Check for duplicate active assignment
    const { data: existing } = await adminSupabase
        .from('transactions')
        .select('id')
        .eq('student_id', params.student_id)
        .eq('book_id', params.book_id)
        .eq('status', 'ACTIVE')
        .maybeSingle()

    if (existing) {
        return { success: false, error: 'Student already has an active assignment of this book' }
    }

    // Create transaction
    const { error: txError } = await adminSupabase
        .from('transactions')
        .insert({
            student_id: params.student_id,
            book_id: params.book_id,
            staff_id: params.staff_id,
            due_date: params.due_date,
            status: 'ACTIVE'
        })

    if (txError) return { success: false, error: txError.message }

    // Update available copies
    await adminSupabase.rpc('decrement_available_copies', { p_book_id: params.book_id })

    revalidatePath('/admin/loans')
    return { success: true }
}

export async function updateStudentProfile(
    studentId: string,
    data: {
        full_name?: string
        registered_number?: string
        department_id?: string
        role?: 'student' | 'admin'
    }
) {
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
    }

    // Prevent demoting the last admin
    if (data.role === 'student' && studentId === user.id) {
        const { count } = await adminSupabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'admin')

        if (count && count <= 1) {
            return { success: false, error: 'Cannot demote the last admin' }
        }
    }

    const { data: updatedProfile, error } = await adminSupabase
        .from('profiles')
        .update(data)
        .eq('id', studentId)
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'This registration number is already in use' }
        }
        return { success: false, error: error.message }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'STUDENT_UPDATE',
        p_metadata: { student_id: studentId, changes: data },
    })

    revalidatePath('/admin/students')

    return { success: true, data: updatedProfile }
}

export async function adminReturnBook(loanId: string) {
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
    }

    const { data, error } = await adminSupabase.rpc('return_book', {
        p_loan_id: loanId,
    })

    if (error) {
        return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string; message?: string }

    if (result.success) {
        // Log admin action
        await adminSupabase.rpc('log_admin_action', {
            p_admin_id: user.id,
            p_action: 'LOAN_OVERRIDE_RETURN',
            p_metadata: { loan_id: loanId },
        })

        revalidatePath('/admin/loans')
    }

    return result
}

export async function extendLoanDueDate(loanId: string, newDueDate: string) {
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
    }

    // Get the loan
    const { data: loan, error: loanError } = await adminSupabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single()

    if (loanError || !loan) {
        return { success: false, error: 'Loan not found' }
    }

    if (loan.status === 'RETURNED') {
        return { success: false, error: 'Cannot extend returned loan' }
    }

    // Update the due date
    const { error } = await adminSupabase
        .from('loans')
        .update({
            due_at: newDueDate,
            status: 'BORROWED' // Reset status if was overdue
        })
        .eq('id', loanId)

    if (error) {
        return { success: false, error: error.message }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'LOAN_EXTEND',
        p_metadata: { loan_id: loanId, new_due_date: newDueDate },
    })

    revalidatePath('/admin/loans')

    return { success: true }
}

export async function updateOverdueLoans() {
    const adminSupabase = await createAdminClient()

    // 1. Mark status as OVERDUE in database
    const { data: updatedCount, error: rpcError } = await adminSupabase.rpc('update_overdue_loans')

    if (rpcError) {
        return { success: false, error: rpcError.message }
    }

    let emailsSent = 0;

    // 2. If records were updated, fetch details to send notifications
    if (updatedCount > 0) {
        const { data: overdueRecords, error: fetchError } = await adminSupabase
            .from('transactions')
            .select(`
                id,
                due_date,
                fine_amount,
                students (id, name, reg_no, email),
                books (id, title),
                staff (id, name, email)
            `)
            .eq('status', 'OVERDUE')
            .gt('updated_at', new Date(Date.now() - 60000).toISOString()) // Records updated in last 1 minute

        if (!fetchError && overdueRecords) {
            const { sendEmail } = await import('@/lib/email')
            
            for (const tx of overdueRecords) {
                const params = {
                    student_name: tx.students?.name || "Student",
                    student_id: tx.students?.reg_no || "N/A",
                    student_email: tx.students?.email || "",
                    book_title: tx.books?.title || "Book",
                    book_id: tx.books?.id || "N/A",
                    due_date: new Date(tx.due_date).toLocaleDateString(),
                    fine_amount: tx.fine_amount || 500,
                }

                // Send to Staff
                if (tx.staff?.email) {
                    await sendEmail('staff', {
                        ...params,
                        to_name: tx.staff.name,
                        to_email: tx.staff.email,
                    })
                    emailsSent++
                }

                // Send to Student
                if (tx.students?.email) {
                    await sendEmail('student', {
                        ...params,
                        to_name: tx.students.name,
                        to_email: tx.students.email,
                    })
                    emailsSent++
                }
            }
        }
    }

    revalidatePath('/admin/loans')
    revalidatePath('/admin/dashboard')

    return { success: true, updated: updatedCount, notifications: emailsSent }
}

export async function getLibraryStats() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return null
    }

    const { data, error } = await supabase.rpc('get_library_stats')

    if (error) {
        console.error('Stats error:', error)
        return null
    }

    return data as {
        total_books: number
        total_copies: number
        available_copies: number
        active_loans: number
        overdue_loans: number
        total_students: number
    }
}

export async function updateOwnProfile(data: {
    full_name?: string
    registered_number?: string
    department_id?: string
}) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'This registration number is already in use' }
        }
        return { success: false, error: error.message }
    }

    revalidatePath('/profile')

    return { success: true, data: updatedProfile }
}
