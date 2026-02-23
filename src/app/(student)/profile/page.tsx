// @ts-nocheck
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { updateOwnProfile } from "@/actions/admin"
import { useToast } from "@/components/ui/use-toast"
import { User, Mail, Building, CreditCard, Loader2, AlertCircle } from "lucide-react"

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: "",
        registered_number: "",
        department_id: "",
    })

    const { toast } = useToast()
    const supabase = createClient()

    const fetchProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

        if (error) {
            console.error("Error fetching profile:", error)
        } else if (data) {
            setProfile(data)
            setFormData({
                full_name: data.full_name || "",
                registered_number: data.registered_number || "",
                department_id: data.department_id || "",
            })
        }
        setLoading(false)
    }, [supabase])

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
        fetchProfile()
        fetchDepartments()
    }, [fetchProfile, fetchDepartments])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const result = await updateOwnProfile({
            full_name: formData.full_name || undefined,
            registered_number: formData.registered_number || undefined,
            department_id: formData.department_id || undefined,
        })

        setSaving(false)

        if (result.success) {
            toast({
                title: "Success!",
                description: "Your profile has been updated",
                variant: "success",
            })
            if (result.data) {
                setProfile(result.data)
            }
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to update profile",
                variant: "destructive",
            })
        }
    }

    const getInitials = (name: string | null) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const isProfileIncomplete = !profile?.registered_number || !profile?.department_id

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-20 w-20 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Profile</h1>
                <p className="text-muted-foreground">
                    Manage your account information
                </p>
            </div>

            {/* Incomplete Profile Warning */}
            {isProfileIncomplete && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">Complete your profile</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Please add your registration number and department to complete your profile.
                        </p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                {getInitials(profile?.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-xl">{profile?.full_name || "User"}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                                <Mail className="h-4 w-4" />
                                {profile?.email}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="full_name" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Full Name
                            </Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="registered_number" className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Registration Number
                            </Label>
                            <Input
                                id="registered_number"
                                value={formData.registered_number}
                                onChange={(e) => setFormData({ ...formData, registered_number: e.target.value })}
                                placeholder="e.g., 2024CSE001"
                            />
                            <p className="text-sm text-muted-foreground">
                                Your unique student registration number
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department" className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Department
                            </Label>
                            <Select
                                value={formData.department_id}
                                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" disabled={saving} className="w-full">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
