"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"

export interface ExcelBookRow {
    book_id: string
    title: string
    author: string
    image_url?: string
    category?: string
    total_copies?: number
    rowNumber: number
    sheetName?: string
}

export interface ValidationResult {
    valid: ExcelBookRow[]
    invalid: { row: ExcelBookRow; errors: string[] }[]
    sheetSummary: { name: string; rowCount: number }[]
}

interface ExcelUploadModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpload: (books: ExcelBookRow[]) => Promise<{ inserted: number; updated: number; failed: number }>
}

const REQUIRED_COLUMNS = ["book_id", "title"]
const OPTIONAL_COLUMNS = ["author", "image_url", "category", "total_copies"]

export function ExcelUploadModal({ open, onOpenChange, onUpload }: ExcelUploadModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState<{ inserted: number; updated: number; failed: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const resetState = () => {
        setFile(null)
        setValidationResult(null)
        setUploadResult(null)
        setError(null)
        setIsProcessing(false)
        setIsUploading(false)
    }

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setError(null)
        setUploadResult(null)
        setIsProcessing(true)

        try {
            const data = await selectedFile.arrayBuffer()
            const workbook = XLSX.read(data)

            // Process ALL sheets
            const allRows: ExcelBookRow[] = []
            const allInvalid: { row: ExcelBookRow; errors: string[] }[] = []
            const sheetSummary: { name: string; rowCount: number }[] = []
            const seenBookIds = new Set<string>()
            let globalRowNumber = 2 // Start at 2 (1 for header)

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)

                if (jsonData.length === 0) {
                    sheetSummary.push({ name: sheetName, rowCount: 0 })
                    continue
                }

                // Check for required columns in this sheet
                const firstRow = jsonData[0] as Record<string, unknown>
                const columns = Object.keys(firstRow)
                const missingColumns = REQUIRED_COLUMNS.filter(col => !columns.includes(col))

                if (missingColumns.length > 0) {
                    // Skip sheets that don't have the right columns structure
                    sheetSummary.push({ name: sheetName, rowCount: 0 })
                    continue
                }

                let sheetRowCount = 0

                jsonData.forEach((row: unknown, index: number) => {
                    const typedRow = row as Record<string, unknown>
                    const errors: string[] = []

                    const bookRow: ExcelBookRow = {
                        book_id: String(typedRow.book_id || "").trim(),
                        title: String(typedRow.title || "").trim(),
                        author: String(typedRow.author || "").trim(),
                        image_url: typedRow.image_url ? String(typedRow.image_url).trim() : undefined,
                        category: typedRow.category ? String(typedRow.category).trim() : undefined,
                        total_copies: typedRow.total_copies ? Number(typedRow.total_copies) : 1,
                        rowNumber: globalRowNumber + index,
                        sheetName: sheetName,
                    }

                    // Validate required fields
                    if (!bookRow.book_id) errors.push("book_id is required")
                    if (!bookRow.title) errors.push("title is required")

                    // Check for duplicate book_id across ALL sheets
                    if (bookRow.book_id && seenBookIds.has(bookRow.book_id)) {
                        errors.push(`Duplicate book_id: ${bookRow.book_id}`)
                    } else if (bookRow.book_id) {
                        seenBookIds.add(bookRow.book_id)
                    }

                    // Validate total_copies
                    if (bookRow.total_copies !== undefined && (isNaN(bookRow.total_copies) || bookRow.total_copies < 1)) {
                        errors.push("total_copies must be a positive number")
                    }

                    if (errors.length > 0) {
                        allInvalid.push({ row: bookRow, errors })
                    } else {
                        allRows.push(bookRow)
                    }
                    sheetRowCount++
                })

                sheetSummary.push({ name: sheetName, rowCount: sheetRowCount })
                globalRowNumber += jsonData.length
            }

            if (allRows.length === 0 && allInvalid.length === 0) {
                setError("No valid data found in any sheet. Ensure sheets have columns: book_id, title, author")
                setValidationResult(null)
                setIsProcessing(false)
                return
            }

            setValidationResult({ valid: allRows, invalid: allInvalid, sheetSummary })
        } catch (err) {
            setError("Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file.")
        } finally {
            setIsProcessing(false)
        }
    }, [])

    const handleUpload = async () => {
        if (!validationResult || validationResult.valid.length === 0) return

        setIsUploading(true)
        try {
            const result = await onUpload(validationResult.valid)
            setUploadResult(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setIsUploading(false)
        }
    }

    const handleClose = () => {
        resetState()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Bulk Upload Books
                    </DialogTitle>
                    <DialogDescription>
                        Upload an Excel file (.xlsx) with books data. All sheets will be processed.
                        Required columns: book_id, title, author. Optional: image_url, category, total_copies.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    {/* Upload Area */}
                    {!validationResult && !uploadResult && (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                                id="excel-upload"
                                disabled={isProcessing}
                            />
                            <label
                                htmlFor="excel-upload"
                                className="cursor-pointer flex flex-col items-center gap-4"
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                ) : (
                                    <Upload className="h-12 w-12 text-muted-foreground" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {isProcessing ? "Processing..." : "Click to upload or drag and drop"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Excel files only (.xlsx, .xls)</p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-destructive">Error</p>
                                <p className="text-sm text-destructive/80">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Validation Results */}
                    {validationResult && !uploadResult && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                <Badge variant="success" className="text-sm">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {validationResult.valid.length} valid
                                </Badge>
                                {validationResult.invalid.length > 0 && (
                                    <Badge variant="destructive" className="text-sm">
                                        <X className="h-3 w-3 mr-1" />
                                        {validationResult.invalid.length} invalid
                                    </Badge>
                                )}
                                {validationResult.sheetSummary.length > 1 && (
                                    <div className="flex items-center gap-2 ml-2">
                                        <span className="text-xs text-muted-foreground">Sheets:</span>
                                        {validationResult.sheetSummary.map((s) => (
                                            <Badge key={s.name} variant="outline" className="text-xs">
                                                {s.name} ({s.rowCount})
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Tabs defaultValue="valid" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="valid">Valid Rows ({validationResult.valid.length})</TabsTrigger>
                                    <TabsTrigger value="invalid" disabled={validationResult.invalid.length === 0}>
                                        Invalid Rows ({validationResult.invalid.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="valid" className="max-h-[300px] overflow-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {validationResult.sheetSummary.length > 1 && <TableHead>Sheet</TableHead>}
                                                <TableHead>Book ID</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Author</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Copies</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {validationResult.valid.slice(0, 50).map((row) => (
                                                <TableRow key={`${row.sheetName}-${row.rowNumber}`}>
                                                    {validationResult.sheetSummary.length > 1 && (
                                                        <TableCell className="text-xs text-muted-foreground">{row.sheetName}</TableCell>
                                                    )}
                                                    <TableCell className="font-mono text-xs">{row.book_id}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate">{row.title}</TableCell>
                                                    <TableCell>{row.author}</TableCell>
                                                    <TableCell>{row.category || "-"}</TableCell>
                                                    <TableCell>{row.total_copies}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {validationResult.valid.length > 50 && (
                                        <p className="text-center text-sm text-muted-foreground py-2">
                                            Showing first 50 of {validationResult.valid.length} rows
                                        </p>
                                    )}
                                </TabsContent>

                                <TabsContent value="invalid" className="max-h-[300px] overflow-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {validationResult.sheetSummary.length > 1 && <TableHead>Sheet</TableHead>}
                                                <TableHead>Book ID</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Errors</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {validationResult.invalid.map(({ row, errors }) => (
                                                <TableRow key={`${row.sheetName}-${row.rowNumber}`}>
                                                    {validationResult.sheetSummary.length > 1 && (
                                                        <TableCell className="text-xs text-muted-foreground">{row.sheetName}</TableCell>
                                                    )}
                                                    <TableCell className="font-mono text-xs">{row.book_id || "-"}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate">{row.title || "-"}</TableCell>
                                                    <TableCell>
                                                        <ul className="text-sm text-destructive">
                                                            {errors.map((err, i) => (
                                                                <li key={i}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    {/* Upload Result */}
                    {uploadResult && (
                        <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <h3 className="font-semibold text-green-800 dark:text-green-200">Upload Complete</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-green-600">{uploadResult.inserted}</p>
                                    <p className="text-sm text-muted-foreground">New Books Added</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-blue-600">{uploadResult.updated}</p>
                                    <p className="text-sm text-muted-foreground">Books Updated</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!uploadResult ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!validationResult || validationResult.valid.length === 0 || isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    `Upload ${validationResult?.valid.length || 0} Books`
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
