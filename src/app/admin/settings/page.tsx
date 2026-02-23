"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Settings } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { updateSettings } from "@/actions/admin"
import { useToast } from "@/components/ui/use-toast"
import { Settings as SettingsIcon, Loader2, Save } from "lucide-react"

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        max_books_per_student: 2,
        default_loan_days: 14,
        allow_renewals: true,
        max_renewals: 1,
    })
    const { toast } = useToast()
    const supabase = createClient()

    const fetchSettings = useCallback(async () => {
        const { data, error } = await supabase.from("settings").select("*").single()
        if (!error && data) {
            const s = data as Settings
            setSettings(s)
            setFormData({
                max_books_per_student: s.max_books_per_student,
                default_loan_days: s.default_loan_days,
                allow_renewals: s.allow_renewals,
                max_renewals: s.max_renewals,
            })
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => { fetchSettings() }, [fetchSettings])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const result = await updateSettings(formData)
        setSaving(false)
        if (result.success) {
            toast({ title: "Success!", description: "Settings updated", variant: "success" })
            fetchSettings()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <Skeleton className="h-8 w-48" />
                <Card><CardContent className="pt-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-bold mb-2">Settings</h1><p className="text-muted-foreground">Configure library system settings</p></div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" />Library Settings</CardTitle>
                    <CardDescription>These settings apply to all users</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="max_books">Maximum Books per Student</Label>
                            <Input id="max_books" type="number" min="1" max="10" value={formData.max_books_per_student}
                                onChange={e => setFormData({ ...formData, max_books_per_student: parseInt(e.target.value) || 1 })} />
                            <p className="text-sm text-muted-foreground">Max books a student can borrow at once</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="loan_duration">Loan Duration (days)</Label>
                            <Input id="loan_duration" type="number" min="1" max="90" value={formData.default_loan_days}
                                onChange={e => setFormData({ ...formData, default_loan_days: parseInt(e.target.value) || 14 })} />
                            <p className="text-sm text-muted-foreground">Default loan period for borrowed books</p>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <Label htmlFor="allow_renewals">Allow Renewals</Label>
                                <p className="text-sm text-muted-foreground">Students can extend their loan due dates</p>
                            </div>
                            <Switch id="allow_renewals" checked={formData.allow_renewals}
                                onCheckedChange={v => setFormData({ ...formData, allow_renewals: v })} />
                        </div>

                        {formData.allow_renewals && (
                            <div className="space-y-2">
                                <Label htmlFor="max_renewals">Maximum Renewals</Label>
                                <Input id="max_renewals" type="number" min="1" max="5" value={formData.max_renewals}
                                    onChange={e => setFormData({ ...formData, max_renewals: parseInt(e.target.value) || 1 })} />
                                <p className="text-sm text-muted-foreground">How many times a loan can be renewed</p>
                            </div>
                        )}

                        <Button type="submit" disabled={saving} className="w-full">
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Settings
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
