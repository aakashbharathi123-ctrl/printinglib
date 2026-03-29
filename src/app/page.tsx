// @ts-nocheck
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BookOpen, ArrowRight, Library, Users, Shield } from "lucide-react"

export default async function HomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profile?.role === "admin") {
            redirect("/admin/dashboard")
        } else {
            await supabase.auth.signOut()
            redirect("/login?error=Access denied. Admin only.")
        }
    } else {
        redirect("/login")
    }

    // This part should not be reachable if redirected
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative h-48 w-48 mx-auto">
                    <Image
                        src="/images/logo.png"
                        alt="Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <h1 className="text-5xl font-bold tracking-tight text-primary">Library Management System</h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                    Administrative Access Only. Please login to manage library operations.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/login">
                        <Button size="lg" className="rounded-xl px-8 py-6 text-lg shadow-xl hover:scale-105 transition-all">
                            Login as Admin
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </div>
            
            <footer className="absolute bottom-8 text-muted-foreground text-sm">
                © 2024 Department of Printing and Packaging Technology. All rights reserved.
            </footer>
        </div>
    )
}
