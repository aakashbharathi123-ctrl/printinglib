// @ts-nocheck
"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { LoanWithBook } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { returnBook, renewBook } from "@/actions/books"
import { useToast } from "@/components/ui/use-toast"
import { formatDate, getDaysUntilDue, getDueStatus } from "@/lib/utils"
import { BookOpen, Calendar, AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react"

export default function MyLoansPage() {
    const [loans, setLoans] = useState<LoanWithBook[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [settings, setSettings] = useState({ allow_renewals: true, max_renewals: 1 })

    const { toast } = useToast()
    const supabase = createClient()

    const fetchLoans = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from("loans")
            .select(`
        *,
        books (*)
      `)
            .eq("user_id", user.id)
            .order("borrowed_at", { ascending: false })

        if (error) {
            console.error("Error fetching loans:", error)
            toast({ title: "Error", description: "Failed to load loans", variant: "destructive" })
        } else {
            setLoans(data as LoanWithBook[] || [])
        }
        setLoading(false)
    }, [supabase, toast])

    const fetchSettings = useCallback(async () => {
        const { data } = await supabase
            .from("settings")
            .select("allow_renewals, max_renewals")
            .single()

        if (data) {
            setSettings(data)
        }
    }, [supabase])

    useEffect(() => {
        fetchLoans()
        fetchSettings()
    }, [fetchLoans, fetchSettings])

    const handleReturn = async (loanId: string) => {
        setActionLoading(loanId)
        const result = await returnBook(loanId)
        setActionLoading(null)

        if (result.success) {
            toast({
                title: "Success!",
                description: result.was_late
                    ? "Book returned (it was overdue)"
                    : "Book returned successfully",
                variant: "success",
            })
            fetchLoans()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to return book",
                variant: "destructive",
            })
        }
    }

    const handleRenew = async (loanId: string) => {
        setActionLoading(`renew-${loanId}`)
        const result = await renewBook(loanId)
        setActionLoading(null)

        if (result.success) {
            toast({
                title: "Success!",
                description: `Book renewed. New due date: ${formatDate(result.new_due_at!)}`,
                variant: "success",
            })
            fetchLoans()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to renew book",
                variant: "destructive",
            })
        }
    }

    const activeLoans = loans.filter(l => l.status !== "RETURNED")
    const historyLoans = loans.filter(l => l.status === "RETURNED")

    const getLoanStatusBadge = (loan: LoanWithBook) => {
        const status = getDueStatus(loan.due_at)

        if (loan.status === "RETURNED") {
            return <Badge variant="secondary">Returned</Badge>
        }
        if (loan.status === "OVERDUE" || status === "overdue") {
            return <Badge variant="destructive">Overdue</Badge>
        }
        if (status === "due-soon") {
            return <Badge variant="warning">Due Soon</Badge>
        }
        return <Badge variant="success">Active</Badge>
    }

    const getDueDateDisplay = (loan: LoanWithBook) => {
        if (loan.status === "RETURNED") {
            return <span className="text-muted-foreground">Returned {formatDate(loan.returned_at!)}</span>
        }

        const daysUntil = getDaysUntilDue(loan.due_at)
        const status = getDueStatus(loan.due_at)

        return (
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={status === "overdue" ? "text-destructive font-medium" : ""}>
                    {formatDate(loan.due_at)}
                </span>
                {status === "overdue" && (
                    <span className="text-destructive text-sm">({Math.abs(daysUntil)} days overdue)</span>
                )}
                {status === "due-soon" && daysUntil >= 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                        ({daysUntil === 0 ? "Due today" : `${daysUntil} day${daysUntil > 1 ? "s" : ""} left`})
                    </span>
                )}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">My Loans</h1>
                <p className="text-muted-foreground">
                    Manage your borrowed books and view your borrowing history
                </p>
            </div>

            {/* Active Loans */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Active Loans ({activeLoans.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeLoans.length === 0 ? (
                        <div className="text-center py-8">
                            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No active loans</h3>
                            <p className="text-muted-foreground">Visit the catalog to borrow books</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book</TableHead>
                                    <TableHead>Borrowed</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeLoans.map((loan) => (
                                    <TableRow key={loan.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{loan.books?.title || "Deleted Book"}</p>
                                                <p className="text-sm text-muted-foreground">{loan.books?.author || "-"}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(loan.borrowed_at)}</TableCell>
                                        <TableCell>{getDueDateDisplay(loan)}</TableCell>
                                        <TableCell>{getLoanStatusBadge(loan)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {settings.allow_renewals && loan.renew_count < settings.max_renewals && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRenew(loan.id)}
                                                    disabled={actionLoading === `renew-${loan.id}`}
                                                >
                                                    {actionLoading === `renew-${loan.id}` ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 mr-1" />
                                                            Renew
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleReturn(loan.id)}
                                                disabled={actionLoading === loan.id}
                                            >
                                                {actionLoading === loan.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Return
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Overdue Warning */}
            {activeLoans.some(l => getDueStatus(l.due_at) === "overdue" || l.status === "OVERDUE") && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-destructive">You have overdue books</p>
                        <p className="text-sm text-destructive/80">
                            Please return them as soon as possible to avoid any penalties.
                        </p>
                    </div>
                </div>
            )}

            {/* History */}
            {historyLoans.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Borrowing History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book</TableHead>
                                    <TableHead>Borrowed</TableHead>
                                    <TableHead>Returned</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyLoans.slice(0, 10).map((loan) => (
                                    <TableRow key={loan.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{loan.books?.title || "Deleted Book"}</p>
                                                <p className="text-sm text-muted-foreground">{loan.books?.author || "-"}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(loan.borrowed_at)}</TableCell>
                                        <TableCell>{formatDate(loan.returned_at!)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {historyLoans.length > 10 && (
                            <p className="text-center text-sm text-muted-foreground mt-4">
                                Showing 10 of {historyLoans.length} records
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
