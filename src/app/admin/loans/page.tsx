"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { 
    Search, 
    Loader2, 
    BookMarked, 
    CheckCircle, 
    Calendar, 
    History, 
    MoreHorizontal, 
    AlertTriangle, 
    Plus,
    UserCircle,
    GraduationCap,
    Clock,
    Filter,
    CheckCircle2,
    Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { 
    fetchAdminLoans, 
    adminReturnBook, 
    fetchStudents,
    fetchStaff,
    assignBook,
    updateOverdueLoans
} from "@/actions/admin"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

export default function BookTrackingDashboard() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [books, setBooks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [staffFilter, setStaffFilter] = useState("all")
    
    // Assignment state
    const [isAssignOpen, setIsAssignOpen] = useState(false)
    const [assignData, setAssignData] = useState({
        student_id: "",
        book_id: "",
        staff_id: "",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    const [studentSearch, setStudentSearch] = useState("")
    const [bookSearch, setBookSearch] = useState("")
    const [isAssigning, setIsAssigning] = useState(false)

    // Return/Extend state
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const { toast } = useToast()
    const supabase = createClient()

    const loadData = useCallback(async () => {
        setLoading(true)
        const [txRes, studRes, staffRes] = await Promise.all([
            fetchAdminLoans(statusFilter),
            fetchStudents(),
            fetchStaff()
        ])

        if (txRes.success) setTransactions(txRes.data || [])
        if (studRes.success) setStudents(studRes.data || [])
        if (staffRes.success) setStaff(staffRes.data || [])
        
        // Trigger overdue status update in background
        updateOverdueLoans()
        
        const { data: bookData } = await supabase.from('books').select('*').eq('is_active', true).gt('available_copies', 0)
        setBooks(bookData || [])
        
        setLoading(false)
    }, [statusFilter, supabase])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleStudentSelect = (id: string) => {
        setAssignData(prev => ({ ...prev, student_id: id }))
    }

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!assignData.student_id || !assignData.book_id || !assignData.staff_id) {
            toast({ title: "Validation Error", description: "Please fill all mandatory fields.", variant: "destructive" })
            return
        }
        
        setIsAssigning(true)
        const result = await assignBook(assignData)
        setIsAssigning(false)

        if (result.success) {
            toast({ title: "Success", description: "Book assigned successfully" })
            setIsAssignOpen(false)
            setAssignData({
                student_id: "",
                book_id: "",
                staff_id: "",
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
            setStudentSearch("")
            setBookSearch("")
            loadData()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    const handleReturn = async (id: string) => {
        setActionLoading(id)
        const result = await adminReturnBook(id)
        setActionLoading(null)
        if (result.success) {
            toast({ title: "Success", description: "Book returned" })
            loadData()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch = 
                tx.students?.name.toLowerCase().includes(search.toLowerCase()) ||
                tx.students?.reg_no.toLowerCase().includes(search.toLowerCase()) ||
                tx.books?.title.toLowerCase().includes(search.toLowerCase())
            
            const matchesStaff = staffFilter === "all" || tx.staff?.id === staffFilter
            const matchesStatus = statusFilter === "all" || tx.status === statusFilter
            
            return matchesSearch && matchesStaff && matchesStatus
        })
    }, [transactions, search, staffFilter, statusFilter])

    const getStatusBadge = (tx: any) => {
        if (tx.status === 'RETURNED') return <Badge className="bg-green-100 text-green-800 border-none rounded-full">Returned</Badge>
        if (tx.status === 'OVERDUE') return <Badge className="bg-destructive/10 text-destructive border-none animate-pulse rounded-full">Overdue (₹500)</Badge>
        return <Badge className="bg-primary/10 text-primary border-none rounded-full">Active</Badge>
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Book Tracking Dashboard</h1>
                    <p className="text-muted-foreground">Monitor loans, manage assignments, and track fines.</p>
                </div>
                <Button onClick={() => setIsAssignOpen(true)} className="rounded-xl px-8 h-14 text-lg shadow-xl shadow-primary/20 bg-primary hover:scale-105 transition-transform">
                    <Plus className="h-5 w-5 mr-2" />
                    Assign Book
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-lg bg-primary/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white"><History className="h-6 w-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Loans</p>
                                <p className="text-3xl font-bold">{transactions.filter(t => t.status === 'ACTIVE').length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-lg bg-destructive/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center text-white"><AlertTriangle className="h-6 w-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                                <p className="text-3xl font-bold">{transactions.filter(t => t.status === 'OVERDUE').length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-lg bg-green-500/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-white"><CheckCircle2 className="h-6 w-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Returned</p>
                                <p className="text-3xl font-bold">{transactions.filter(t => t.status === 'RETURNED').length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm bg-muted/20">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl bg-background border-none h-11" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="rounded-xl border-none h-11 bg-background">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="OVERDUE">Overdue</SelectItem>
                            <SelectItem value="RETURNED">Returned</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={staffFilter} onValueChange={setStaffFilter}>
                        <SelectTrigger className="rounded-xl border-none h-11 bg-background">
                            <SelectValue placeholder="Assigned Staff" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Staff</SelectItem>
                            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" onClick={() => { setSearch(""); setStaffFilter("all"); setStatusFilter("all"); }} className="rounded-xl border h-11 hover:bg-background">Reset</Button>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p>Loading...</p></div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-24 text-center"><BookMarked className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" /><h3 className="text-xl font-bold">No records found</h3></div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="py-4 pl-6">Student & Book</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map((tx) => (
                                    <TableRow key={tx.id} className="hover:bg-primary/5 transition-colors group">
                                        <TableCell className="py-5 pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{tx.students?.name}</span>
                                                <span className="text-xs text-muted-foreground">{tx.students?.reg_no}</span>
                                                <span className="text-sm mt-1 text-primary">{tx.books?.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm text-muted-foreground">
                                                <span>Borrowed: {new Date(tx.borrow_date).toLocaleDateString()}</span>
                                                <span className="font-medium text-foreground">Due: {new Date(tx.due_date).toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(tx)}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            {tx.status !== 'RETURNED' && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-5 w-5" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                        <DropdownMenuItem onClick={() => handleReturn(tx.id)} disabled={!!actionLoading} className="text-green-600">Mark Returned</DropdownMenuItem>
                                                        <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Send Reminder</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-primary p-8 text-white">
                        <DialogTitle className="text-3xl font-bold">Assign Book</DialogTitle>
                        <DialogDescription className="text-white/70">Create a new assignment record.</DialogDescription>
                    </div>
                    <form onSubmit={handleAssign} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <UserCircle className="h-4 w-4" />
                                        Student Name *
                                    </Label>
                                    <Select value={assignData.student_id} onValueChange={handleStudentSelect}>
                                        <SelectTrigger className="rounded-xl h-12">
                                            <SelectValue placeholder="Search Name..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-[300px]">
                                            {students.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        Reg No *
                                    </Label>
                                    <Select value={assignData.student_id} onValueChange={handleStudentSelect}>
                                        <SelectTrigger className="rounded-xl h-12 font-mono text-sm">
                                            <SelectValue placeholder="Search Reg No..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-[300px]">
                                            {students.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.reg_no}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold">Staff</Label>
                                <Select value={assignData.staff_id} onValueChange={(v) => setAssignData({...assignData, staff_id: v})}>
                                    <SelectTrigger className="rounded-xl h-12">
                                        <SelectValue placeholder="Select Staff" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold">Book</Label>
                                <Select value={assignData.book_id} onValueChange={(v) => setAssignData({...assignData, book_id: v})}>
                                    <SelectTrigger className="rounded-xl h-12">
                                        <SelectValue placeholder="Select Book" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {books.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold">Due Date</Label>
                                <Input type="date" value={assignData.due_date} onChange={(e) => setAssignData({...assignData, due_date: e.target.value})} className="rounded-xl h-12" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isAssigning} className="w-full h-14 text-xl rounded-2xl shadow-xl shadow-primary/30">Confirm Assignment</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
