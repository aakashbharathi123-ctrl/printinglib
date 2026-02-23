"use client"

import { useState, useEffect, useCallback } from "react"
import { LoanWithBookAndUser } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { adminReturnBook, extendLoanDueDate, updateOverdueLoans, fetchAdminLoans } from "@/actions/admin"
import { useToast } from "@/components/ui/use-toast"
import { formatDate, getDaysUntilDue, getDueStatus } from "@/lib/utils"
import { Search, Loader2, BookMarked, CheckCircle, Calendar, RefreshCw, MoreHorizontal, AlertTriangle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function AdminLoansPage() {
    const [loans, setLoans] = useState<LoanWithBookAndUser[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [refreshing, setRefreshing] = useState(false)
    const [isExtendOpen, setIsExtendOpen] = useState(false)
    const [extendingLoan, setExtendingLoan] = useState<LoanWithBookAndUser | null>(null)
    const [newDueDate, setNewDueDate] = useState("")
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const { toast } = useToast()

    const fetchLoans = useCallback(async () => {
        setLoading(true)
        const result = await fetchAdminLoans(statusFilter)
        if (result.success) {
            let filtered = result.data as LoanWithBookAndUser[] || []
            if (search) {
                const s = search.toLowerCase()
                filtered = filtered.filter(l => l.books.title.toLowerCase().includes(s) || l.profiles.email?.toLowerCase().includes(s))
            }
            setLoans(filtered)
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
        setLoading(false)
    }, [search, statusFilter, toast])

    useEffect(() => { fetchLoans() }, [fetchLoans])
    useEffect(() => { const t = setTimeout(fetchLoans, 300); return () => clearTimeout(t) }, [search, statusFilter, fetchLoans])

    const handleRefreshOverdue = async () => {
        setRefreshing(true)
        const result = await updateOverdueLoans()
        setRefreshing(false)
        if (result.success) { toast({ title: "Updated", description: `${result.updated} marked overdue`, variant: "success" }); fetchLoans() }
        else toast({ title: "Error", description: result.error, variant: "destructive" })
    }

    const handleReturn = async (loanId: string) => {
        setActionLoading(loanId)
        const result = await adminReturnBook(loanId)
        setActionLoading(null)
        if (result.success) { toast({ title: "Success!", description: "Returned", variant: "success" }); fetchLoans() }
        else toast({ title: "Error", description: result.error, variant: "destructive" })
    }

    const openExtendDialog = (loan: LoanWithBookAndUser) => {
        setExtendingLoan(loan)
        const d = new Date(loan.due_at); d.setDate(d.getDate() + 7)
        setNewDueDate(d.toISOString().split("T")[0])
        setIsExtendOpen(true)
    }

    const handleExtend = async () => {
        if (!extendingLoan) return
        setActionLoading(`extend-${extendingLoan.id}`)
        const result = await extendLoanDueDate(extendingLoan.id, new Date(newDueDate).toISOString())
        setActionLoading(null)
        if (result.success) { toast({ title: "Success!", description: "Extended", variant: "success" }); setIsExtendOpen(false); fetchLoans() }
        else toast({ title: "Error", description: result.error, variant: "destructive" })
    }

    const getBadge = (loan: LoanWithBookAndUser) => {
        if (loan.status === "RETURNED") return <Badge variant="secondary">Returned</Badge>
        if (loan.status === "OVERDUE" || getDueStatus(loan.due_at) === "overdue") return <Badge variant="destructive">Overdue</Badge>
        if (getDueStatus(loan.due_at) === "due-soon") return <Badge variant="warning">Due Soon</Badge>
        return <Badge variant="success">Active</Badge>
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div><h1 className="text-3xl font-bold mb-2">Loans Management</h1><p className="text-muted-foreground">Track and manage loans</p></div>
                <Button variant="outline" onClick={handleRefreshOverdue} disabled={refreshing}>
                    {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Refresh Overdue
                </Button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="BORROWED">Borrowed</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                        <SelectItem value="RETURNED">Returned</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5" />Loans ({loans.length})</CardTitle></CardHeader>
                <CardContent>
                    {loading ? <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div> :
                        loans.length === 0 ? <div className="text-center py-12"><BookMarked className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium">No loans found</h3></div> :
                            <Table>
                                <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Borrower</TableHead><TableHead>Borrowed</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loans.map(loan => (
                                        <TableRow key={loan.id}>
                                            <TableCell><p className="font-medium">{loan.books.title}</p></TableCell>
                                            <TableCell><p>{loan.profiles.full_name || loan.profiles.email}</p></TableCell>
                                            <TableCell>{formatDate(loan.borrowed_at)}</TableCell>
                                            <TableCell>{loan.status === "RETURNED" ? `Returned ${formatDate(loan.returned_at!)}` : formatDate(loan.due_at)}</TableCell>
                                            <TableCell>{getBadge(loan)}</TableCell>
                                            <TableCell className="text-right">
                                                {loan.status !== "RETURNED" && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleReturn(loan.id)}><CheckCircle className="h-4 w-4 mr-2" />Return</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openExtendDialog(loan)}><Calendar className="h-4 w-4 mr-2" />Extend</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>}
                </CardContent>
            </Card>

            <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Extend Due Date</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-muted rounded-lg"><p className="font-medium">{extendingLoan?.books.title}</p><p className="text-sm text-muted-foreground">Current due: {extendingLoan && formatDate(extendingLoan.due_at)}</p></div>
                        <div className="space-y-2"><Label>New Due Date</Label><Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsExtendOpen(false)}>Cancel</Button><Button onClick={handleExtend} disabled={!!actionLoading}>{actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Extend</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
