"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Book } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExcelUploadModal, ExcelBookRow } from "@/components/excel-upload-modal"
import { createBook, updateBook, deleteBook, bulkUpsertBooks } from "@/actions/books"
import { useToast } from "@/components/ui/use-toast"
import {
    Search,
    Plus,
    Upload,
    Edit,
    Trash2,
    Loader2,
    BookOpen,
    MoreHorizontal,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BookFormData {
    book_id: string
    title: string
    author: string
    image_url: string
    category: string
    total_copies: number
}

const initialFormData: BookFormData = {
    book_id: "",
    title: "",
    author: "",
    image_url: "",
    category: "",
    total_copies: 1,
}

export default function AdminBooksPage() {
    const [books, setBooks] = useState<Book[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [editingBook, setEditingBook] = useState<Book | null>(null)
    const [deletingBook, setDeletingBook] = useState<Book | null>(null)
    const [formData, setFormData] = useState<BookFormData>(initialFormData)
    const [saving, setSaving] = useState(false)

    const { toast } = useToast()
    const supabase = createClient()

    const fetchBooks = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from("books")
            .select("*")
            .order("title")

        if (search) {
            query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,book_id.ilike.%${search}%`)
        }

        if (categoryFilter && categoryFilter !== "all") {
            query = query.eq("category", categoryFilter)
        }

        const { data, error } = await query

        if (error) {
            console.error("Error fetching books:", error)
        } else {
            setBooks(data || [])
        }
        setLoading(false)
    }, [search, categoryFilter, supabase])

    const fetchCategories = useCallback(async () => {
        const { data } = await supabase
            .from("books")
            .select("category")
            .not("category", "is", null)

        if (data) {
            const uniqueCategories = [...new Set(data.map(b => b.category).filter(Boolean))] as string[]
            setCategories(uniqueCategories.sort())
        }
    }, [supabase])

    useEffect(() => {
        fetchBooks()
        fetchCategories()
    }, [fetchBooks, fetchCategories])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchBooks()
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [search, categoryFilter, fetchBooks])

    const openAddDialog = () => {
        setEditingBook(null)
        setFormData(initialFormData)
        setIsFormOpen(true)
    }

    const openEditDialog = (book: Book) => {
        setEditingBook(book)
        setFormData({
            book_id: book.book_id,
            title: book.title,
            author: book.author,
            image_url: book.image_url || "",
            category: book.category || "",
            total_copies: book.total_copies,
        })
        setIsFormOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        if (editingBook) {
            const result = await updateBook(editingBook.id, {
                title: formData.title,
                author: formData.author,
                image_url: formData.image_url || undefined,
                category: formData.category || undefined,
                total_copies: formData.total_copies,
            })

            if (result.success) {
                toast({ title: "Success!", description: "Book updated successfully", variant: "success" })
                setIsFormOpen(false)
                fetchBooks()
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            }
        } else {
            const result = await createBook({
                book_id: formData.book_id,
                title: formData.title,
                author: formData.author,
                image_url: formData.image_url || undefined,
                category: formData.category || undefined,
                total_copies: formData.total_copies,
            })

            if (result.success) {
                toast({ title: "Success!", description: "Book created successfully", variant: "success" })
                setIsFormOpen(false)
                fetchBooks()
                fetchCategories()
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            }
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        if (!deletingBook) return
        setSaving(true)

        const result = await deleteBook(deletingBook.id)

        if (result.success) {
            toast({ title: "Success!", description: "Book deleted successfully", variant: "success" })
            setIsDeleteOpen(false)
            setDeletingBook(null)
            fetchBooks()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
        setSaving(false)
    }

    const handleBulkUpload = async (books: ExcelBookRow[]) => {
        return await bulkUpsertBooks(books)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Books Management</h1>
                    <p className="text-muted-foreground">
                        Manage your library's book collection
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload
                    </Button>
                    <Button onClick={openAddDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Book
                    </Button>
                </div>
            </div>

            {/* Filters */}
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
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Books Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Books ({books.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : books.length === 0 ? (
                        <div className="text-center py-12">
                            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No books found</h3>
                            <p className="text-muted-foreground mb-4">
                                {search || categoryFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "Add your first book to get started"}
                            </p>
                            {!search && categoryFilter === "all" && (
                                <Button onClick={openAddDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Book
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Copies</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {books.map((book) => (
                                    <TableRow key={book.id} className={!book.is_active ? "opacity-50" : ""}>
                                        <TableCell className="font-mono text-sm">{book.book_id}</TableCell>
                                        <TableCell className="font-medium max-w-[200px] truncate">{book.title}</TableCell>
                                        <TableCell>{book.author}</TableCell>
                                        <TableCell>{book.category || "-"}</TableCell>
                                        <TableCell>
                                            <span className={book.available_copies === 0 ? "text-destructive" : ""}>
                                                {book.available_copies}/{book.total_copies}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {!book.is_active ? (
                                                <Badge variant="secondary">Inactive</Badge>
                                            ) : book.available_copies === 0 ? (
                                                <Badge variant="destructive">Unavailable</Badge>
                                            ) : (
                                                <Badge variant="success">Available</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(book)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setDeletingBook(book)
                                                            setIsDeleteOpen(true)
                                                        }}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle>
                        <DialogDescription>
                            {editingBook ? "Update the book information" : "Enter the details for the new book"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="book_id">Book ID *</Label>
                                <Input
                                    id="book_id"
                                    value={formData.book_id}
                                    onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                                    placeholder="e.g., ISBN-001"
                                    disabled={!!editingBook}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Book title"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="author">Author *</Label>
                                <Input
                                    id="author"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                    placeholder="Author name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Computer Science"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL</Label>
                                <Input
                                    id="image_url"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="total_copies">Total Copies</Label>
                                <Input
                                    id="total_copies"
                                    type="number"
                                    min="1"
                                    value={formData.total_copies}
                                    onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingBook ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Book</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{deletingBook?.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Excel Upload Modal */}
            <ExcelUploadModal
                open={isUploadOpen}
                onOpenChange={(open) => {
                    setIsUploadOpen(open)
                    if (!open) {
                        fetchBooks()
                        fetchCategories()
                    }
                }}
                onUpload={handleBulkUpload}
            />
        </div>
    )
}
