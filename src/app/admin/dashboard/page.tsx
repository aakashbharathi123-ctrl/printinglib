import { createClient } from "@/lib/supabase/server"
import { getLibraryStats } from "@/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BookOpen,
    Users,
    BookMarked,
    AlertTriangle,
    TrendingUp,
    Library
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminDashboard() {
    const supabase = await createClient()
    const stats = await getLibraryStats()

    // Get recent loans for activity
    const { data: recentLoans } = await supabase
        .from("loans")
        .select(`
      *,
      books (title, book_id),
      profiles (full_name, email)
    `)
        .order("created_at", { ascending: false })
        .limit(5)

    const statCards = [
        {
            title: "Total Books",
            value: stats?.total_books || 0,
            subtitle: `${stats?.total_copies || 0} total copies`,
            icon: Library,
            color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
            href: "/admin/books",
        },
        {
            title: "Available Copies",
            value: stats?.available_copies || 0,
            subtitle: "Ready to borrow",
            icon: BookOpen,
            color: "text-green-600 bg-green-100 dark:bg-green-900/30",
            href: "/admin/books",
        },
        {
            title: "Active Loans",
            value: stats?.active_loans || 0,
            subtitle: "Currently borrowed",
            icon: BookMarked,
            color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
            href: "/admin/loans",
        },
        {
            title: "Overdue",
            value: stats?.overdue_loans || 0,
            subtitle: "Need attention",
            icon: AlertTriangle,
            color: stats?.overdue_loans ? "text-red-600 bg-red-100 dark:bg-red-900/30" : "text-gray-600 bg-gray-100 dark:bg-gray-900/30",
            href: "/admin/loans?status=overdue",
        },
        {
            title: "Total Students",
            value: stats?.total_students || 0,
            subtitle: "Registered users",
            icon: Users,
            color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
            href: "/admin/students",
        },
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of your library management system
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/books">
                        <Button>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Manage Books
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {statCards.map((stat) => (
                    <Link key={stat.title} href={stat.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${stat.color}`}>
                                    <stat.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>Latest borrowing activity</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentLoans && recentLoans.length > 0 ? (
                        <div className="space-y-4">
                            {recentLoans.map((loan: any) => (
                                <div
                                    key={loan.id}
                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${loan.status === 'BORROWED' ? 'bg-blue-500' :
                                                loan.status === 'RETURNED' ? 'bg-green-500' :
                                                    'bg-red-500'
                                            }`} />
                                        <div>
                                            <p className="font-medium text-sm">{loan.books?.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {loan.profiles?.full_name || loan.profiles?.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full ${loan.status === 'BORROWED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                loan.status === 'RETURNED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {loan.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No recent activity</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
