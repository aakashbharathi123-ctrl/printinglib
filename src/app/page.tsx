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
            .single() as { data: { role: string } | null, error: any }

        if (profile?.role === "admin") {
            redirect("/admin/dashboard")
        } else {
            redirect("/catalog")
        }
    }

    return (
        <div className="relative min-h-screen flex flex-col">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/download.png"
                    alt="Department of Printing and Packaging Technology"
                    fill
                    className="object-cover object-bottom object-center"
                    priority
                />
                <div className="absolute inset-0 bg-black/60" /> {/* Dark overlay for readability */}
            </div>

            {/* Content - Hero Section */}
            <div className="relative z-8 flex-1 flex items-center justify-center">
                <div className="container mx-auto px-4 py-16 text-center text-white">
                    <div className="relative h-60 w-60 mx-auto mb-8">
                        <Image
                            src="/images/logo.png"
                            alt="Anna University Logo"
                            fill
                            className="object-contain drop-shadow-lg brightness-0 invert"
                            priority
                        />
                    </div>

                    <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-8 drop-shadow-lg">
                        Department of <br />
                        <span className="text-primary-foreground text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">
                            Printing and Packaging Technology
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-12 drop-shadow-md">
                        Library Management System. Browse our extensive collection, manage loans, and access resources efficiently.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Link href="/login">
                            <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-xl shadow-black/20 bg-primary hover:bg-primary/90 text-primary-foreground border-0">
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/catalog">
                            <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white">
                                Browse Catalog
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features (Overlay at bottom or separate section? Let's keep it below the hero, maybe with a different background) */}
            <div className="relative z-10 py-24">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white hover:bg-white/15 hover:shadow-2xl transition-all duration-300">
                            <div className="h-14 w-14 rounded-xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                                <Library className="h-7 w-7 text-blue-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Browse Catalog</h3>
                            <p className="text-gray-300">
                                Explore our extensive collection of books. Search, filter, and find your next read.
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white hover:bg-white/15 hover:shadow-2xl transition-all duration-300">
                            <div className="h-14 w-14 rounded-xl bg-green-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                                <Users className="h-7 w-7 text-green-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Easy Borrowing</h3>
                            <p className="text-gray-300">
                                Borrow books with a single click. Track due dates and manage your loans effortlessly.
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white hover:bg-white/15 hover:shadow-2xl transition-all duration-300">
                            <div className="h-14 w-14 rounded-xl bg-purple-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                                <Shield className="h-7 w-7 text-purple-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
                            <p className="text-gray-300">
                                Your data is protected with enterprise-grade security. Sign in with Google for quick access.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t mt-24 py-8">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>© 2024 Library Management System. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
