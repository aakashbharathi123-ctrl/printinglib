"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, UserPlus, Pencil, Trash2, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { fetchStaff, addStaff, updateStaff, deleteStaff } from "@/actions/admin"

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [selectedStaff, setSelectedStaff] = useState<any>(null)
    const [staffName, setStaffName] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        loadStaff()
    }, [])

    const loadStaff = async () => {
        setLoading(true)
        const result = await fetchStaff()
        if (result.success) {
            setStaff(result.data || [])
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
        setLoading(false)
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!staffName.trim()) return
        setIsSubmitting(true)
        const result = await addStaff(staffName)
        setIsSubmitting(false)
        if (result.success) {
            toast({ title: "Success", description: "Staff added successfully" })
            setIsAddOpen(false)
            setStaffName("")
            loadStaff()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!staffName.trim() || !selectedStaff) return
        setIsSubmitting(true)
        const result = await updateStaff(selectedStaff.id, staffName)
        setIsSubmitting(false)
        if (result.success) {
            toast({ title: "Success", description: "Staff updated successfully" })
            setIsEditOpen(false)
            setSelectedStaff(null)
            setStaffName("")
            loadStaff()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    const handleDelete = async () => {
        if (!selectedStaff) return
        setIsSubmitting(true)
        const result = await deleteStaff(selectedStaff.id)
        setIsSubmitting(false)
        if (result.success) {
            toast({ title: "Success", description: "Staff deleted successfully" })
            setIsDeleteOpen(false)
            setSelectedStaff(null)
            loadStaff()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    const filteredStaff = staff.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Staff Management</h1>
                    <p className="text-muted-foreground">Maintain the list of authorized staff for book approvals.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="rounded-xl px-6 py-6 h-auto text-lg shadow-lg hover:shadow-primary/20 transition-all">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add Staff Member
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                Staff List
                            </CardTitle>
                            <CardDescription>Currently authorized staff in the system.</CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search staff..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 rounded-xl bg-muted/30 border-none h-11"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p>Loading staff list...</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold">Name</TableHead>
                                        <TableHead className="font-bold">Added Date</TableHead>
                                        <TableHead className="text-right font-bold w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStaff.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                                                No staff found. Click "Add Staff Member" to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStaff.map((person) => (
                                            <TableRow key={person.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium text-lg py-4">{person.name}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(person.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                            <DropdownMenuLabel>Manage</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedStaff(person)
                                                                setStaffName(person.name)
                                                                setIsEditOpen(true)
                                                            }} className="cursor-pointer">
                                                                <Pencil className="h-4 w-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => {
                                                                    setSelectedStaff(person)
                                                                    setIsDeleteOpen(true)
                                                                }}
                                                                className="cursor-pointer text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <form onSubmit={handleAdd}>
                        <DialogHeader>
                            <DialogTitle>Add New Staff Member</DialogTitle>
                            <DialogDescription>Enter the full name of the staff member authorized to approve books.</DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-semibold">Staff Full Name</Label>
                                <Input 
                                    id="name" 
                                    placeholder="e.g. Dr. Jane Smith" 
                                    value={staffName}
                                    onChange={(e) => setStaffName(e.target.value)}
                                    autoFocus
                                    required
                                    className="rounded-xl h-12"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="rounded-xl px-6">
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Add Staff
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Edit Staff Member</DialogTitle>
                            <DialogDescription>Update the name for this staff member.</DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-sm font-semibold">Staff Full Name</Label>
                                <Input 
                                    id="edit-name" 
                                    value={staffName}
                                    onChange={(e) => setStaffName(e.target.value)}
                                    autoFocus
                                    required
                                    className="rounded-xl h-12"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="rounded-xl px-6">
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Update Staff
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Confirm Deletion</DialogTitle>
                        <DialogDescription>Are you sure you want to remove <span className="font-bold text-foreground">{selectedStaff?.name}</span>? This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete} 
                            disabled={isSubmitting}
                            className="rounded-xl px-6 shadow-lg shadow-destructive/20"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete Staff
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
