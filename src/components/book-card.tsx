"use client"

import Image from "next/image"
import { Book, type Book as BookType } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAvailabilityStatus } from "@/lib/utils"
import { BookOpen, Loader2 } from "lucide-react"
import { useState } from "react"

interface BookCardProps {
    book: BookType
    onBorrow?: (bookId: string) => Promise<void>
    isBorrowing?: boolean
    userHasBook?: boolean
    userAtLimit?: boolean
    maxBooks?: number
    showActions?: boolean
}

export function BookCard({
    book,
    onBorrow,
    isBorrowing = false,
    userHasBook = false,
    userAtLimit = false,
    maxBooks = 2,
    showActions = true,
}: BookCardProps) {
    const [imageError, setImageError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const availability = getAvailabilityStatus(book.available_copies, book.total_copies)

    const handleBorrow = async () => {
        if (!onBorrow) return
        setIsLoading(true)
        try {
            await onBorrow(book.id)
        } finally {
            setIsLoading(false)
        }
    }

    const getAvailabilityBadge = () => {
        switch (availability) {
            case 'available':
                return <Badge variant="success">{book.available_copies} available</Badge>
            case 'low':
                return <Badge variant="warning">Only {book.available_copies} left</Badge>
            case 'unavailable':
                return <Badge variant="destructive">Unavailable</Badge>
        }
    }

    const getButtonState = () => {
        if (userHasBook) {
            return { disabled: true, text: "Already Borrowed" }
        }
        if (availability === 'unavailable') {
            return { disabled: true, text: "Unavailable" }
        }
        if (userAtLimit) {
            return { disabled: true, text: `Limit Reached (${maxBooks})` }
        }
        return { disabled: false, text: "Borrow" }
    }

    const buttonState = getButtonState()

    return (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            {/* Book Cover Image */}
            <div className="relative h-48 w-full bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                {book.image_url && !imageError ? (
                    <Image
                        src={book.image_url}
                        alt={book.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImageError(true)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary/30" />
                    </div>
                )}
                {/* Category Badge */}
                {book.category && (
                    <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                            {book.category}
                        </Badge>
                    </div>
                )}
            </div>

            <CardContent className="p-4">
                {/* Title */}
                <h3 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {book.title}
                </h3>

                {/* Author */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                    by {book.author}
                </p>

                {/* Book ID */}
                <p className="text-xs text-muted-foreground/70 mb-3">
                    ID: {book.book_id}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2">
                    {getAvailabilityBadge()}

                    {showActions && onBorrow && (
                        <Button
                            size="sm"
                            onClick={handleBorrow}
                            disabled={buttonState.disabled || isLoading || isBorrowing}
                            className="min-w-[100px]"
                        >
                            {(isLoading || isBorrowing) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                buttonState.text
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
