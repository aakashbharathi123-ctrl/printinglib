"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Profile, Department } from "@/types/database"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateStudentProfile } from "@/actions/admin"
import { useToast } from "@/components/ui/use-toast"
import { Search, Edit, Loader2, Users, ShieldCheck } from "lucide-react"

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<Profile[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [departmentFilter, setDepartmentFilter] = useState("all")

    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingStudent, setEditingStudent] = useState<Profile | null>(null)
    const [formData, setFormData] = useState({
        full_name: "",
        registered_number: "",
        department_id: "",
        role: "student" as "student" | "admin",
    })
    const [saving, setSaving] = useState(false)

    const { toast } = useToast()
    const supabase = createClient()

    const fetchStudents = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false })

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,registered_number.ilike.%${search}%`)
        }

        if (departmentFilter && departmentFilter !== "all") {
            query = query.eq("department_id", departmentFilter)
        }

        const { data, error } = await query

        if (error) {
            console.error("Error fetching students:", error)
        } else {
            setStudents(data || [])
        }
        setLoading(false)
    }, [search, departmentFilter, supabase])

    const fetchDepartments = useCallback(async () => {
        const { data } = await supabase
            .from("departments")
            .select("*")
            .order("name")

        if (data) {
            setDepartments(data)
        }
    }, [supabase])

    useEffect(() => {
        fetchStudents()
        fetchDepartments()
    }, [fetchStudents, fetchDepartments])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchStudents()
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [search, departmentFilter, fetchStudents])

    const openEditDialog = (student: Profile) => {
        setEditingStudent(student)
        setFormData({
            full_name: student.full_name || "",
            registered_number: student.registered_number || "",
            department_id: student.department_id || "",
            role: student.role,
        })
        setIsEditOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingStudent) return
        setSaving(true)

        const result = await updateStudentProfile(editingStudent.id, {
            full_name: formData.full_name || undefined,
            registered_number: formData.registered_number || undefined,
            department_id: formData.department_id || undefined,
            role: formData.role,
        })

        if (result.success) {
            toast({ title: "Success!", description: "Student updated successfully", variant: "success" })
            setIsEditOpen(false)
            fetchStudents()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
        setSaving(false)
    }

    const getInitials = (name: string | null) => {
        if (!name) return "U"
        return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const getDepartmentName = (id: string | null) => {
        if (!id) return "-"
        return departments.find(d => d.id === id)?.name || id
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Students Management</h1>
                <p className="text-muted-foreground">
                    View and manage student profiles
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or registration number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Students Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Users ({students.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No users found</h3>
                            <p className="text-muted-foreground">
                                {search || departmentFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "No users have registered yet"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Registration No.</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={student.avatar_url || undefined} />
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(student.full_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{student.full_name || "Unnamed"}</p>
                                                    <p className="text-sm text-muted-foreground">{student.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {student.registered_number || "-"}
                                        </TableCell>
                                        <TableCell>{getDepartmentName(student.department_id)}</TableCell>
                                        <TableCell>
                                            {student.role === "admin" ? (
                                                <Badge variant="default" className="gap-1">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Student</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information and role
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={editingStudent?.avatar_url || undefined} />
                                    <AvatarFallback>{getInitials(editingStudent?.full_name || null)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{editingStudent?.full_name || "Unnamed"}</p>
                                    <p className="text-sm text-muted-foreground">{editingStudent?.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Full name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="registered_number">Registration Number</Label>
                                <Input
                                    id="registered_number"
                                    value={formData.registered_number}
                                    onChange={(e) => setFormData({ ...formData, registered_number: e.target.value })}
                                    placeholder="e.g., 2024CSE001"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Select
                                    value={formData.department_id}
                                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: "student" | "admin") => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Update
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
