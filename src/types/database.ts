export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            departments: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    role: 'student' | 'admin'
                    full_name: string | null
                    email: string | null
                    avatar_url: string | null
                    registered_number: string | null
                    department_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    role?: 'student' | 'admin'
                    full_name?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    registered_number?: string | null
                    department_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    role?: 'student' | 'admin'
                    full_name?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    registered_number?: string | null
                    department_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            books: {
                Row: {
                    id: string
                    book_id: string
                    title: string
                    author: string
                    image_url: string | null
                    category: string | null
                    total_copies: number
                    available_copies: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    book_id: string
                    title: string
                    author: string
                    image_url?: string | null
                    category?: string | null
                    total_copies?: number
                    available_copies?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    book_id?: string
                    title?: string
                    author?: string
                    image_url?: string | null
                    category?: string | null
                    total_copies?: number
                    available_copies?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            loans: {
                Row: {
                    id: string
                    user_id: string
                    book_id: string
                    borrowed_at: string
                    due_at: string
                    returned_at: string | null
                    status: 'BORROWED' | 'RETURNED' | 'OVERDUE'
                    renew_count: number
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    book_id: string
                    borrowed_at?: string
                    due_at: string
                    returned_at?: string | null
                    status?: 'BORROWED' | 'RETURNED' | 'OVERDUE'
                    renew_count?: number
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    book_id?: string
                    borrowed_at?: string
                    due_at?: string
                    returned_at?: string | null
                    status?: 'BORROWED' | 'RETURNED' | 'OVERDUE'
                    renew_count?: number
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            settings: {
                Row: {
                    id: number
                    max_books_per_student: number
                    default_loan_days: number
                    fine_per_day: number
                    allow_renewals: boolean
                    max_renewals: number
                    updated_at: string
                }
                Insert: {
                    id?: number
                    max_books_per_student?: number
                    default_loan_days?: number
                    fine_per_day?: number
                    allow_renewals?: boolean
                    max_renewals?: number
                    updated_at?: string
                }
                Update: {
                    id?: number
                    max_books_per_student?: number
                    default_loan_days?: number
                    fine_per_day?: number
                    allow_renewals?: boolean
                    max_renewals?: number
                    updated_at?: string
                }
            }
            admin_audit_logs: {
                Row: {
                    id: string
                    admin_id: string
                    action: string
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    admin_id: string
                    action: string
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    admin_id?: string
                    action?: string
                    metadata?: Json | null
                    created_at?: string
                }
            }
        }
        Functions: {
            is_admin: {
                Args: { user_id: string }
                Returns: boolean
            }
            borrow_book: {
                Args: { p_user_id: string; p_book_id: string; p_created_by?: string }
                Returns: Json
            }
            return_book: {
                Args: { p_loan_id: string; p_user_id?: string }
                Returns: Json
            }
            renew_book: {
                Args: { p_loan_id: string; p_user_id: string }
                Returns: Json
            }
            update_overdue_loans: {
                Args: Record<string, never>
                Returns: number
            }
            get_library_stats: {
                Args: Record<string, never>
                Returns: Json
            }
            log_admin_action: {
                Args: { p_admin_id: string; p_action: string; p_metadata?: Json }
                Returns: string
            }
        }
    }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type Loan = Database['public']['Tables']['loans']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row']

// Extended types with relations
export type LoanWithBook = Loan & {
    books: Book
}

export type LoanWithUser = Loan & {
    profiles: Profile
}

export type LoanWithBookAndUser = Loan & {
    books: Book
    profiles: Profile
}
