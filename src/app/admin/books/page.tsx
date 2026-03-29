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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    Image as ImageIcon,
    X
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"

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
    
    // Image upload state
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>("")
    const [isUploadingImage, setIsUploadingImage] = useState(false)

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
            // Fix: Cast data to avoid 'never' type errors during mapping
            const categoriesSet = new Set((data as any[]).map(b => b.category).filter((c): c is string => !!c))
            const uniqueCategories = Array.from(categoriesSet)
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
        setImageFile(null)
        setImagePreview("")
        setIsFormOpen(true)
    }

    const openEditDialog = (book: Book) => {
        const cleanImageUrl = (book.image_url && book.image_url.toUpperCase() !== 'NULL') ? book.image_url : "";
        const cleanCategory = (book.category && book.category.toUpperCase() !== 'NULL') ? book.category : "";

        setEditingBook(book)
        setFormData({
            book_id: book.book_id,
            title: book.title,
            author: book.author,
            image_url: cleanImageUrl,
            category: cleanCategory,
            total_copies: book.total_copies,
        })
        setImageFile(null)
        setImagePreview(cleanImageUrl)
        setIsFormOpen(true)
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const uploadImage = async (file: File) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `book-covers/${fileName}`

        const { error: uploadError, data } = await supabase.storage
            .from('book-images')
            .upload(filePath, file)

        if (uploadError) {
            throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
            .from('book-images')
            .getPublicUrl(filePath)

        return publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            let finalImageUrl = formData.image_url

            if (imageFile) {
                setIsUploadingImage(true)
                finalImageUrl = await uploadImage(imageFile)
                setIsUploadingImage(false)
            }

            if (editingBook) {
                const result = await updateBook(editingBook.id, {
                    title: formData.title,
                    author: formData.author,
                    image_url: finalImageUrl || undefined,
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
                    image_url: finalImageUrl || undefined,
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
        } catch (error: any) {
            toast({ title: "Upload Error", description: error.message || "Failed to upload image", variant: "destructive" })
        } finally {
            setSaving(false)
            setIsUploadingImage(false)
        }
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Books Management</h1>
                    <p className="text-muted-foreground">Manage your library's collection and book inventory.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="rounded-xl border-primary/20 hover:bg-primary/5">
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload
                    </Button>
                    <Button onClick={openAddDialog} className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Book
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, author, or book ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-muted/30 border-none h-11">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Books Table */}
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-primary" />
                        Book Inventory ({books.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : books.length === 0 ? (
                        <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed">
                            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No books found</h3>
                            <p className="text-muted-foreground mb-6">
                                {search || categoryFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "Add your first book to get started"}
                            </p>
                            {!search && categoryFilter === "all" && (
                                <Button onClick={openAddDialog} className="rounded-xl">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Book
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-muted/50 overflow-hidden bg-background/50">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="py-4">Book</TableHead>
                                        <TableHead className="py-4">ID</TableHead>
                                        <TableHead className="py-4">Author</TableHead>
                                        <TableHead className="py-4">Category</TableHead>
                                        <TableHead className="py-4">Available</TableHead>
                                        <TableHead className="text-right py-4 pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {books.map((book) => (
                                        <TableRow key={book.id} className={cn("hover:bg-primary/5 transition-colors group", !book.is_active && "opacity-50")}>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative h-14 w-10 bg-muted rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                                                        {book.image_url && book.image_url.toUpperCase() !== 'NULL' ? (
                                                            <Image src={book.image_url} alt={book.title} fill className="object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full w-full">
                                                                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="max-w-[180px]">
                                                        <p className="font-bold text-lg truncate leading-none mb-1">{book.title}</p>
                                                        <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-primary/80">{book.book_id}</TableCell>
                                            <TableCell>{book.author}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-lg font-normal bg-muted/50">{book.category || "-"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn("font-bold", book.available_copies === 0 ? "text-destructive" : "text-primary text-xl")}>
                                                        {book.available_copies}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">of {book.total_copies} total</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                {!book.is_active ? (
                                                    <Badge variant="secondary" className="rounded-full px-3">Inactive</Badge>
                                                ) : book.available_copies === 0 ? (
                                                    <Badge variant="destructive" className="rounded-full px-3">Unavailable</Badge>
                                                ) : (
                                                    <Badge className="rounded-full px-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none shadow-none">Available</Badge>
                                                )}
                                                <div className="inline-block ml-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl w-40">
                                                            <DropdownMenuItem onClick={() => openEditDialog(book)} className="cursor-pointer">
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit Book
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setDeletingBook(book)
                                                                    setIsDeleteOpen(true)
                                                                }}
                                                                className="text-destructive focus:text-destructive cursor-pointer"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-primary/10 p-6">
                        <DialogTitle className="text-2xl">{editingBook ? "Update Book Details" : "Register New Book"}</DialogTitle>
                        <DialogDescription className="text-primary/70">
                            Provide the necessary information to update the library inventory.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Image Section */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Book Cover Image</Label>
                                <div className="relative group aspect-[3/4] rounded-2xl bg-muted border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all hover:border-primary/50">
                                    {imagePreview && imagePreview.toUpperCase() !== 'NULL' ? (
                                        <>
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button type="button" variant="destructive" size="icon" className="rounded-full" onClick={() => {
                                                    setImageFile(null)
                                                    setImagePreview("")
                                                    setFormData({...formData, image_url: ""})
                                                }}>
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
                                            <p className="text-sm text-muted-foreground text-center px-4">Click to upload cover</p>
                                        </>
                                    )}
                                    <Input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-center">Supported: JPG, PNG, WebP (Max 5MB)</p>
                            </div>

                            {/* Form Fields Section */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="book_id" className="font-semibold">Book ID (ISBN/UID) *</Label>
                                    <Input
                                        id="book_id"
                                        value={formData.book_id}
                                        onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                                        placeholder="e.g., ISBN-001"
                                        disabled={!!editingBook}
                                        required
                                        className="rounded-xl h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="font-semibold">Book Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Enter full title"
                                        required
                                        className="rounded-xl h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="author" className="font-semibold">Primary Author *</Label>
                                    <Input
                                        id="author"
                                        value={formData.author}
                                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                        placeholder="Author's full name"
                                        required
                                        className="rounded-xl h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="font-semibold">Category</Label>
                                    <Input
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="e.g., Engineering"
                                        className="rounded-xl h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="total_copies" className="font-semibold">Total Stock/Copies</Label>
                                    <Input
                                        id="total_copies"
                                        type="number"
                                        min="1"
                                        value={formData.total_copies}
                                        onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) || 1 })}
                                        className="rounded-xl h-11"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="p-6 bg-muted/10">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving || isUploadingImage} className="rounded-xl px-10 h-14 text-lg shadow-xl shadow-primary/20">
                                {(saving || isUploadingImage) && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                                {editingBook ? "Save Changes" : "Create Record"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-destructive flex items-center gap-2">
                            <Trash2 className="h-6 w-6" />
                            Delete Book
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Are you sure you want to delete <span className="font-bold text-foreground">"{deletingBook?.title}"</span>? This action is permanent and will remove all associated records.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={saving} className="rounded-xl px-8 h-12 shadow-lg shadow-destructive/20">
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete Forever
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
const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
