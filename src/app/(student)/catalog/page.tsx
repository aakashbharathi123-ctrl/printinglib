// @ts-nocheck
"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Book } from "@/types/database"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { borrowBook } from "@/actions/books"
import { useToast } from "@/components/ui/use-toast"
import { Search, Filter, BookOpen } from "lucide-react"

export default function CatalogPage() {
    const [books, setBooks] = useState<Book[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState<string>("all")
    const [userBorrowedBookIds, setUserBorrowedBookIds] = useState<Set<string>>(new Set())
    const [userLoanCount, setUserLoanCount] = useState(0)
    const [maxBooks, setMaxBooks] = useState(2)
    const [borrowingBookId, setBorrowingBookId] = useState<string | null>(null)

    const { toast } = useToast()
    const supabase = createClient()

    const fetchBooks = useCallback(async () => {
        setLoading(true)

        let query = supabase
            .from("books")
            .select("*")
            .eq("is_active", true)
            .order("title")

        if (search) {
            query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,book_id.ilike.%${search}%`)
        }

        if (category && category !== "all") {
            query = query.eq("category", category)
        }

        const { data, error } = await query

        if (error) {
            console.error("Error fetching books:", error)
            toast({ title: "Error", description: "Failed to load books", variant: "destructive" })
        } else {
            setBooks(data || [])
        }
        setLoading(false)
    }, [search, category, supabase, toast])

    const fetchUserLoans = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: loans } = await supabase
            .from("loans")
            .select("book_id")
            .eq("user_id", user.id)
            .eq("status", "BORROWED")

        if (loans) {
            setUserBorrowedBookIds(new Set(loans.map(l => l.book_id)))
            setUserLoanCount(loans.length)
        }
    }, [supabase])

    const fetchSettings = useCallback(async () => {
        const { data } = await supabase
            .from("settings")
            .select("max_books_per_student")
            .single()

        if (data) {
            setMaxBooks(data.max_books_per_student)
        }
    }, [supabase])

    const fetchCategories = useCallback(async () => {
        const { data } = await supabase
            .from("books")
            .select("category")
            .eq("is_active", true)
            .not("category", "is", null)

        if (data) {
            const uniqueCategories = [...new Set(data.map(b => b.category).filter(Boolean))] as string[]
            setCategories(uniqueCategories.sort())
        }
    }, [supabase])

    useEffect(() => {
        fetchBooks()
        fetchUserLoans()
        fetchSettings()
        fetchCategories()
    }, [fetchBooks, fetchUserLoans, fetchSettings, fetchCategories])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchBooks()
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [search, category, fetchBooks])

    const handleBorrow = async (bookId: string) => {
        setBorrowingBookId(bookId)
        const result = await borrowBook(bookId)
        setBorrowingBookId(null)

        if (result.success) {
            toast({
                title: "Success!",
                description: result.message || "Book borrowed successfully",
                variant: "success",
            })
            // Refresh data
            fetchBooks()
            fetchUserLoans()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to borrow book",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Book Catalog</h1>
                <p className="text-muted-foreground">
                    Browse and borrow from our collection of {books.length} books
                </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, author, or book ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Borrow Status */}
            {userLoanCount > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <p className="text-sm">
                        You have <strong>{userLoanCount}</strong> of <strong>{maxBooks}</strong> books borrowed.
                        {userLoanCount >= maxBooks && (
                            <span className="text-destructive ml-1">Return a book to borrow more.</span>
                        )}
                    </p>
                </div>
            )}

            {/* Books Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <BookCardSkeleton key={i} />
                    ))}
                </div>
            ) : books.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No books found</h3>
                    <p className="text-muted-foreground">
                        {search || category !== "all"
                            ? "Try adjusting your search or filters"
                            : "No books are available at the moment"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.map((book) => (
                        <BookCard
                            key={book.id}
                            book={book}
                            onBorrow={handleBorrow}
                            isBorrowing={borrowingBookId === book.id}
                            userHasBook={userBorrowedBookIds.has(book.id)}
                            userAtLimit={userLoanCount >= maxBooks}
                            maxBooks={maxBooks}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
