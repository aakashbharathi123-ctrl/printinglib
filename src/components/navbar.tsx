"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Profile } from "@/types/database"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
    BookOpen,
    Library,
    User,
    LogOut,
    LayoutDashboard,
    Users,
    Settings,
    BookMarked,
    History
} from "lucide-react"

import Image from "next/image"

interface NavbarProps {
    user: Profile | null
}

const studentNavItems = [
    { href: "/catalog", label: "Catalog", icon: Library },
    { href: "/my-loans", label: "My Loans", icon: BookMarked },
    { href: "/profile", label: "Profile", icon: User },
]

const adminNavItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/books", label: "Books", icon: Library },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/loans", label: "Loans", icon: History },
    { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Navbar({ user }: NavbarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const isAdmin = user?.role === "admin"
    const navItems = isAdmin ? adminNavItems : studentNavItems

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-20 items-center">
                {/* Logo and Department Name */}
                <Link href={isAdmin ? "/admin/dashboard" : "/catalog"} className="flex items-center gap-4 mr-8 group">
                    <div className="relative h-16 w-16 shrink-0 transition-transform group-hover:scale-105">
                        <Image
                            src="/images/logo.png"
                            alt="Anna University Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-tight text-primary">Anna University</span>
                        <span className="text-sm font-medium text-muted-foreground leading-tight">Department of Printing and Packaging Technology</span>
                    </div>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-1 flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "gap-2",
                                        isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span className="hidden md:inline">{item.label}</span>
                                </Button>
                            </Link>
                        )
                    })}
                </div>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.avatar_url || undefined} alt={user?.full_name || "User"} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(user?.full_name)}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.full_name || "User"}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                {user?.role === "admin" && (
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1 w-fit">
                                        Admin
                                    </span>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {!isAdmin && (
                            <>
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/my-loans" className="cursor-pointer">
                                        <BookMarked className="mr-2 h-4 w-4" />
                                        My Loans
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    )
}
