import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: {
        default: "Library for Printing and Packaging Department | Anna University",
        template: "%s | PPT Library - Anna University",
    },
    description:
        "Official Library Management System for the Department of Printing and Packaging Technology, Anna University. Browse books, manage loans, and access academic resources.",
    keywords: [
        "Anna University",
        "Printing and Packaging Technology",
        "Library",
        "PPT Department",
        "Book Management",
        "Student Portal",
    ],
    authors: [{ name: "Department of Printing and Packaging Technology" }],
    icons: {
        icon: "/images/logo.png",
        apple: "/images/logo.png",
    },
    openGraph: {
        title: "Library for Printing and Packaging Department | Anna University",
        description:
            "Official Library Management System for the Department of Printing and Packaging Technology, Anna University.",
        type: "website",
        locale: "en_IN",
        images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "Anna University PPT Department Logo" }],
    },
    twitter: {
        card: "summary",
        title: "Library for Printing and Packaging Department | Anna University",
        description:
            "Official Library Management System for the Department of Printing and Packaging Technology, Anna University.",
        images: ["/images/logo.png"],
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                {children}
                <Toaster />
            </body>
        </html>
    )
}
