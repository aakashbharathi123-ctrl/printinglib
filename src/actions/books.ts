'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ExcelBookRow } from '@/components/excel-upload-modal'

export async function borrowBook(bookId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Use the database function for atomic operation
    const { data, error } = await supabase.rpc('borrow_book', {
        p_user_id: user.id,
        p_book_id: bookId,
    })

    if (error) {
        console.error('Borrow error:', error)
        return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string; loan_id?: string; due_at?: string; message?: string }

    if (result.success) {
        revalidatePath('/catalog')
        revalidatePath('/my-loans')
    }

    return result
}

export async function returnBook(loanId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Use the database function for atomic operation
    const { data, error } = await supabase.rpc('return_book', {
        p_loan_id: loanId,
        p_user_id: user.id,
    })

    if (error) {
        console.error('Return error:', error)
        return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string; message?: string; was_late?: boolean }

    if (result.success) {
        revalidatePath('/catalog')
        revalidatePath('/my-loans')
        revalidatePath('/admin/loans')
    }

    return result
}

export async function renewBook(loanId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('renew_book', {
        p_loan_id: loanId,
        p_user_id: user.id,
    })

    if (error) {
        console.error('Renew error:', error)
        return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string; message?: string; new_due_at?: string; renewals_remaining?: number }

    if (result.success) {
        revalidatePath('/my-loans')
        revalidatePath('/admin/loans')
    }

    return result
}

export async function bulkUpsertBooks(books: ExcelBookRow[]) {
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { inserted: 0, updated: 0, failed: books.length, error: 'Not authenticated' }
    }

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { inserted: 0, updated: 0, failed: books.length, error: 'Admin access required' }
    }

    let inserted = 0
    let updated = 0
    let failed = 0

    for (const book of books) {
        try {
            // Check if book exists
            const { data: existing } = await adminSupabase
                .from('books')
                .select('id, available_copies, total_copies')
                .eq('book_id', book.book_id)
                .single()

            if (existing) {
                // Update existing book
                // Calculate new available copies - maintain the difference
                const borrowedCopies = existing.total_copies - existing.available_copies
                const newTotal = book.total_copies || existing.total_copies
                const newAvailable = Math.max(0, newTotal - borrowedCopies)

                const { error } = await adminSupabase
                    .from('books')
                    .update({
                        title: book.title,
                        author: book.author,
                        image_url: book.image_url,
                        category: book.category,
                        total_copies: newTotal,
                        available_copies: newAvailable,
                    })
                    .eq('id', existing.id)

                if (error) throw error
                updated++
            } else {
                // Insert new book
                const { error } = await adminSupabase
                    .from('books')
                    .insert({
                        book_id: book.book_id,
                        title: book.title,
                        author: book.author || '',
                        image_url: book.image_url,
                        category: book.category,
                        total_copies: book.total_copies || 1,
                        available_copies: book.total_copies || 1,
                    })

                if (error) throw error
                inserted++
            }
        } catch (error) {
            console.error('Error processing book:', book.book_id, error)
            failed++
        }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'BULK_UPLOAD',
        p_metadata: { inserted, updated, failed, total: books.length },
    })

    revalidatePath('/admin/books')
    revalidatePath('/catalog')

    return { inserted, updated, failed }
}

export async function createBook(bookData: {
    book_id: string
    title: string
    author: string
    image_url?: string
    category?: string
    total_copies?: number
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

    const totalCopies = bookData.total_copies || 1

    const { data, error } = await adminSupabase
        .from('books')
        .insert({
            ...bookData,
            total_copies: totalCopies,
            available_copies: totalCopies,
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'A book with this ID already exists' }
        }
        return { success: false, error: error.message }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'BOOK_CREATE',
        p_metadata: { book_id: data.id, book_code: bookData.book_id },
    })

    revalidatePath('/admin/books')
    revalidatePath('/catalog')

    return { success: true, data }
}

export async function updateBook(
    id: string,
    bookData: {
        title?: string
        author?: string
        image_url?: string
        category?: string
        total_copies?: number
        is_active?: boolean
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

    // If updating total_copies, need to handle available_copies
    let updateData = { ...bookData }

    if (bookData.total_copies !== undefined) {
        const { data: existing } = await adminSupabase
            .from('books')
            .select('total_copies, available_copies')
            .eq('id', id)
            .single()

        if (existing) {
            const borrowedCopies = existing.total_copies - existing.available_copies

            // Prevent reducing below borrowed count
            if (bookData.total_copies < borrowedCopies) {
                return {
                    success: false,
                    error: `Cannot reduce total copies below ${borrowedCopies} (currently borrowed)`
                }
            }

            updateData = {
                ...updateData,
                available_copies: bookData.total_copies - borrowedCopies,
            }
        }
    }

    const { data, error } = await adminSupabase
        .from('books')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'BOOK_UPDATE',
        p_metadata: { book_id: id, changes: bookData },
    })

    revalidatePath('/admin/books')
    revalidatePath('/catalog')

    return { success: true, data }
}

export async function deleteBook(id: string) {
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

    // Check if book has active loans
    const { count } = await adminSupabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', id)
        .eq('status', 'BORROWED')

    if (count && count > 0) {
        return { success: false, error: 'Cannot delete book with active loans' }
    }

    // Hard delete the book
    const { error } = await adminSupabase
        .from('books')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    // Log admin action
    await adminSupabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: 'BOOK_DELETE',
        p_metadata: { book_id: id },
    })

    revalidatePath('/admin/books')
    revalidatePath('/catalog')

    return { success: true }
}
