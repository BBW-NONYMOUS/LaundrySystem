/** Shapes of the Website inbox resources (app/Http/Resources). */

export type BookingRequestStatus =
    | 'pending'
    | 'confirmed'
    | 'declined'
    | 'cancelled';

/** BookingRequestResource */
export type BookingRequestRow = {
    id: number;
    reference: string;
    status: BookingRequestStatus;
    status_label: string;
    name: string;
    phone: string;
    email: string | null;
    address: string;
    pickup_date: string;
    time_slot: string;
    time_slot_label: string;
    time_window: string;
    scheduled_at: string;
    service: { id: number; name: string; unit_short: string } | null;
    estimated_quantity: number | null;
    is_express: boolean;
    wants_delivery: boolean;
    special_instructions: string | null;
    /** Existing customer with the same mobile number. */
    customer: { id: number; name: string; orders_count: number | null } | null;
    order: { id: number; order_number: string; status: string } | null;
    handled_by: string | null;
    handled_at: string | null;
    decline_reason: string | null;
    created_at: string | null;
};

export type ContactMessageStatus = 'new' | 'read' | 'resolved';

/** ContactMessageResource */
export type ContactMessageRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    subject: string | null;
    message: string;
    status: ContactMessageStatus;
    status_label: string;
    handled_by: string | null;
    read_at: string | null;
    resolved_at: string | null;
    created_at: string | null;
};

/** FaqResource */
export type FaqRow = {
    id: number;
    question: string;
    answer: string;
    category: string;
    sort_order: number;
    is_published: boolean;
    show_on_home: boolean;
};

/** TestimonialResource */
export type TestimonialRow = {
    id: number;
    author_name: string;
    rating: number;
    comment: string;
    /** "feedback" (rating link) or "manual" (typed in by the owner). */
    source: string;
    is_approved: boolean;
    is_featured: boolean;
    customer: { id: number; name: string } | null;
    order: { id: number; order_number: string } | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string | null;
};

/** `counts` props come from GROUP BY queries: an empty result is serialized as []. */
export type StatusCounts = Partial<Record<string, number>> | [];

export function countOf(counts: StatusCounts, key: string): number {
    return Array.isArray(counts) ? 0 : (counts[key] ?? 0);
}
