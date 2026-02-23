import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function getDaysUntilDue(dueDate: string | Date): number {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getDueStatus(dueDate: string | Date): 'overdue' | 'due-soon' | 'ok' {
    const daysUntil = getDaysUntilDue(dueDate)
    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 2) return 'due-soon'
    return 'ok'
}

export function getAvailabilityStatus(available: number, total: number): 'available' | 'low' | 'unavailable' {
    if (available === 0) return 'unavailable'
    if (available <= Math.ceil(total * 0.2)) return 'low'
    return 'available'
}
