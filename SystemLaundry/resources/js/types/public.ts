import type { OrderStatus } from '@/types/models';

/** Shared `site` prop: public business details from Settings (App\Support\SiteSettings). */
export type SiteSettings = {
    name: string | null;
    tagline: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    hours: string | null;
    /** schema.org format, e.g. "Mo-Sa 07:00-20:00, Su 08:00-17:00". */
    opening_hours: string | null;
    service_area: string | null;
    facebook_url: string | null;
    messenger_url: string | null;
    instagram_url: string | null;
    map_link: string | null;
    logo_url: string | null;
    currency_symbol: string | null;
    /** Photos present in public/images/site, by name ("hero", "why-us", …). */
    images: string[];
};

/** `seo` prop from App\Services\SeoService::page(). */
export type Seo = {
    title: string;
    description: string;
    url: string;
    image: string;
    type: string;
    site_name: string;
    json_ld: Record<string, unknown>[];
    noindex?: boolean;
};

/** HomeController::pricingRules(). */
export type PricingRules = {
    express_surcharge_percent: number;
    delivery_fee_per_trip: number;
    currency_symbol: string | null;
    service_area: string | null;
};

/** App\Support\PublicStats. */
export type PublicStats = {
    orders_completed: number;
    customers: number;
    years_in_service: number;
    fastest_express_hours: number | null;
    reviews_count: number;
    average_rating: number | null;
};

/** Testimonial::publicData(). */
export type PublicTestimonial = {
    id: number;
    author_name: string;
    rating: number;
    comment: string;
    date: string | null;
};

export type PublicFaq = {
    id: number;
    question: string;
    answer: string;
    category?: string;
};

/** App\Support\PublicOrderSummary: privacy-safe order for tracking pages. */
export type PublicOrder = {
    order_number: string;
    tracking_code: string;
    customer_first_name: string;
    status: OrderStatus;
    status_label: string;
    status_color: string;
    is_express: boolean;
    received_at: string | null;
    due_at: string | null;
    total_amount: number;
    balance: number;
    items: { service_name: string; quantity: number; unit: string }[];
    timeline: { status: OrderStatus; label: string; at: string }[];
    pickup_scheduled_at: string | null;
    delivery_scheduled_at: string | null;
};

/** App\Enums\PickupSlot values. */
export type PickupSlotValue = '09:00' | '13:00' | '16:00';

/** BookingService::availability(). */
export type BookingSlot = {
    value: PickupSlotValue;
    label: string;
    window: string;
    remaining: number;
    available: boolean;
    reason: string | null;
};

/** BookingService::bookableDates(). */
export type BookableDate = {
    date: string;
    available: boolean;
};

/** Flashed after a guest booking is saved. */
export type BookingConfirmation = {
    reference: string;
    name: string;
    date: string;
    window: string;
    phone: string;
};
