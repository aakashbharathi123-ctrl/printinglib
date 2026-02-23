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
        .from('loans')
        .select('*, books (*), profiles!user_id(*)')
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
        revalidatePath('/catalog')
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

    const { data, error } = await adminSupabase.rpc('update_overdue_loans')

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/loans')
    revalidatePath('/admin/dashboard')

    return { success: true, updated: data }
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
