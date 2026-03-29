/**
 * EmailJS Integration for Library Management System
 * 
 * To enable notifications:
 * 1. Create an EmailJS account at https://www.emailjs.com/
 * 2. Add these variables to your .env file:
 *    NEXT_PUBLIC_EMAILJS_SERVICE_ID=...
 *    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=...
 *    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=...
 */

export async function sendOverdueReminder(params: {
    staff_name: string,
    staff_email?: string,
    student_name: string,
    book_title: string,
    due_date: string,
    fine_amount: number
}) {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        console.warn("EmailJS credentials missing. Notification not sent.");
        return { success: false, error: "EmailJS credentials not configured" };
    }

    try {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                template_params: {
                    to_name: params.staff_name,
                    student_name: params.student_name,
                    book_title: params.book_title,
                    due_date: params.due_date,
                    fine_amount: params.fine_amount,
                    reply_to: "library-admin@university.edu"
                },
            }),
        });

        if (response.ok) {
            return { success: true };
        } else {
            const error = await response.text();
            return { success: false, error };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
