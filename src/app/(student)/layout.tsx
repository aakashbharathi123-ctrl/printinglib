// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    // If admin, they can also access student pages if they want
    // No redirect needed here

    return (
        <div className="min-h-screen bg-background">
            <Navbar user={profile} />
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    )
}
