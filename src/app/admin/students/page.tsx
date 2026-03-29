"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Edit, Loader2, Users, Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { fetchStudents, bulkUploadStudents } from "@/actions/admin"

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [uploadResults, setUploadResults] = useState<{ success: number, total: number } | null>(null)

    const { toast } = useToast()

    const loadStudents = useCallback(async () => {
        setLoading(true)
        const result = await fetchStudents()
        if (result.success) {
            setStudents(result.data || [])
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
        setLoading(false)
    }, [toast])

    useEffect(() => {
        loadStudents()
    }, [loadStudents])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) setCsvFile(file)
    }

    const processBulkUpload = async () => {
        if (!csvFile) return
        setIsUploading(true)
        
        try {
            const text = await csvFile.text()
            const lines = text.split("\n")
            if (lines.length < 2) throw new Error("CSV is empty")
            
            const headers = lines[0].toLowerCase().split(",").map(h => h.trim())
            
            // Map headers to indices
            const regIdx = headers.findIndex(h => h.includes("registration no") || h.includes("reg_no") || h.includes("reg no"))
            const nameIdx = headers.findIndex(h => h.includes("full name") || h.includes("name"))
            const surnameIdx = headers.findIndex(h => h.includes("surname") || h.includes("initials"))
            const emailIdx = headers.findIndex(h => h.includes("email"))
            const mobileIdx = headers.findIndex(h => h.includes("mobile") || h.includes("phone"))

            if (nameIdx === -1 || regIdx === -1) {
                toast({ 
                    title: "Invalid CSV", 
                    description: "CSV must at least have 'Full Name' and 'Registration No' columns.", 
                    variant: "destructive" 
                })
                setIsUploading(false)
                return
            }

            const parsedStudents = lines.slice(1)
                .map(line => {
                    const parts = line.split(",").map(p => p.trim())
                    return {
                        name: parts[nameIdx] || "",
                        reg_no: parts[regIdx] || "",
                        surname: surnameIdx !== -1 ? parts[surnameIdx] : "",
                        email: emailIdx !== -1 ? parts[emailIdx] : "",
                        mobile: mobileIdx !== -1 ? parts[mobileIdx] : ""
                    }
                })
                .filter(s => s.name && s.reg_no)

            if (parsedStudents.length === 0) {
                toast({ title: "Empty CSV", description: "No valid student records found.", variant: "destructive" })
                setIsUploading(false)
                return
            }

            const result = await bulkUploadStudents(parsedStudents)
            if (result.success) {
                setUploadResults({ success: result.count!, total: parsedStudents.length })
                toast({ title: "Upload Success", description: `Uploaded ${result.count} students.` })
                loadStudents()
                setCsvFile(null)
            } else {
                toast({ title: "Upload Error", description: result.error, variant: "destructive" })
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to parse CSV file.", variant: "destructive" })
        } finally {
            setIsUploading(false)
        }
    }

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.reg_no.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.mobile?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Student Management</h1>
                    <p className="text-muted-foreground">Manage student records and perform bulk operations via CSV.</p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)} className="rounded-xl px-6 py-6 h-auto text-lg shadow-lg hover:shadow-primary/20 transition-all border-none">
                    <Upload className="h-5 w-5 mr-2" />
                    Bulk Student Upload
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                Student Directory ({students.length})
                            </CardTitle>
                        </div>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or register number..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg">Accessing student database...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-24 bg-muted/10 rounded-2xl border border-dashed">
                            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No students found</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                {search ? "Try a different search term or check for typos." : "Upload a CSV file to populate the student directory."}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-muted/50 overflow-hidden bg-background/50">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="py-4 pl-6">Student Details</TableHead>
                                        <TableHead>Registration No</TableHead>
                                        <TableHead>Surname</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Mobile</TableHead>
                                        <TableHead className="text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map((student) => (
                                        <TableRow key={student.id} className="hover:bg-primary/5 transition-colors group">
                                            <TableCell className="font-semibold text-lg py-5 pl-6">{student.name}</TableCell>
                                            <TableCell className="font-mono text-primary/80">{student.reg_no}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.surname || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{student.email || "-"}</TableCell>
                                            <TableCell className="text-sm font-mono">{student.mobile || "-"}</TableCell>
                                            <TableCell className="text-right pr-6">
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Active
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bulk Upload Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={(open) => {
                setIsUploadOpen(open)
                if (!open) {
                    setCsvFile(null)
                    setUploadResults(null)
                }
            }}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-primary/10 p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">Bulk Upload Students</DialogTitle>
                            <DialogDescription className="text-primary/70">Upload student records using a CSV file.</DialogDescription>
                        </div>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        {!uploadResults ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20 space-y-4">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        CSV Requirements:
                                    </h4>
                                    <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
                                        <li>Must contain a header row.</li>
                                        <li>Required: <code>Registration No</code>, <code>Full Name</code>.</li>
                                        <li>Optional: <code>Surname or Initials</code>, <code>Email</code>, <code>Mobile</code>.</li>
                                        <li>File must be in <code>.csv</code> format.</li>
                                    </ul>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-lg font-semibold">Select CSV File</Label>
                                    <div className="relative group">
                                        <Input 
                                            type="file" 
                                            accept=".csv" 
                                            onChange={handleFileUpload}
                                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                        />
                                        <div className="border-2 border-dashed border-muted group-hover:border-primary/50 transition-colors p-10 rounded-2xl flex flex-col items-center gap-3 bg-muted/10">
                                            {csvFile ? (
                                                <>
                                                    <FileText className="h-10 w-10 text-primary" />
                                                    <p className="font-semibold">{csvFile.name}</p>
                                                    <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(2)} KB</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-10 w-10 text-muted-foreground/50" />
                                                    <p className="font-medium text-muted-foreground text-center">Click or drag and drop to upload student CSV</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold">Upload Complete!</h3>
                                <div className="grid grid-cols-2 gap-4 w-full px-4">
                                    <div className="bg-muted/30 p-4 rounded-xl">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Successful</p>
                                        <p className="text-3xl font-bold text-green-600">{uploadResults.success}</p>
                                    </div>
                                    <div className="bg-muted/30 p-4 rounded-xl">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Rows</p>
                                        <p className="text-3xl font-bold">{uploadResults.total}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="p-6 bg-muted/10">
                        {uploadResults ? (
                            <Button onClick={() => setIsUploadOpen(false)} className="w-full rounded-xl py-6 h-auto text-lg">Close</Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => setIsUploadOpen(false)} className="rounded-xl">Cancel</Button>
                                <Button 
                                    onClick={processBulkUpload} 
                                    disabled={!csvFile || isUploading}
                                    className="rounded-xl px-10 h-14 text-lg shadow-xl shadow-primary/20"
                                >
                                    {isUploading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                                    Upload & Import
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
