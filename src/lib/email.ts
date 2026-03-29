/**
 * EmailJS Integration for Library Management System
 */

type EmailParams = {
    to_name: string;
    to_email: string;
    student_name: string;
    student_id?: string;
    student_email?: string;
    student_mobile?: string;
    book_title: string;
    book_id?: string;
    due_date: string;
    fine_amount: number;
    reply_to?: string;
}

export async function sendEmail(templateType: 'staff' | 'student', params: EmailParams) {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    
    // Choose the right template ID
    const templateId = templateType === 'staff' 
        ? process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID 
        : process.env.NEXT_PUBLIC_EMAILJS_STUDENT_TEMPLATE_ID;

    // DIAGNOSTIC LOG (Masked)
    console.log(`[EmailJS] Sending ${templateType} notification:`, {
        serviceId: serviceId ? `${serviceId.slice(0, 4)}***` : "MISSING",
        templateId: templateId ? `${templateId.slice(0, 4)}***` : "MISSING",
        publicKey: publicKey ? `${publicKey.slice(0, 4)}***` : "MISSING",
        to_email: params.to_email
    });

    if (!serviceId || !templateId || !publicKey) {
        console.warn(`EmailJS credentials missing for ${templateType} notification. Not sent.`);
        return { success: false, error: "EmailJS credentials not configured" };
    }

    try {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                template_params: {
                    to_name: params.to_name,
                    staff_email: templateType === 'staff' ? params.to_email : undefined,
                    student_name: params.student_name,
                    student_email: params.student_email || params.to_email,
                    student_id: params.student_id || "N/A",
                    student_mobile: params.student_mobile || "N/A",
                    book_title: params.book_title,
                    book_id: params.book_id || "N/A",
                    due_date: params.due_date,
                    fine_amount: params.fine_amount,
                    reply_to: params.reply_to || "library-admin@university.edu"
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

// Backward compatibility or shorthand if needed
export async function sendOverdueReminder(params: any) {
    // Determine the primary recipient and type
    return sendEmail('staff', {
        ...params,
        to_name: params.staff_name,
        to_email: params.staff_email || "", // This needs to be correctly passed
    });
}
