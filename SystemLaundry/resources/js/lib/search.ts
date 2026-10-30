import { search } from '@/routes';
import type { Customer, OrderStatus } from '@/types/models';

export type CustomerHit = Pick<
    Customer,
    'id' | 'name' | 'phone' | 'email' | 'address'
>;

export type OrderHit = {
    id: number;
    order_number: string;
    customer_name: string;
    status: OrderStatus;
    status_label: string;
};

/**
 * GET /search — the one JSON endpoint (Ctrl+K palette and customer combobox).
 */
export async function searchEverything(
    term: string,
    signal?: AbortSignal,
): Promise<{ customers: CustomerHit[]; orders: OrderHit[] }> {
    if (term.trim().length < 2) {
        return { customers: [], orders: [] };
    }

    const response = await fetch(search.url({ query: { q: term } }), {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        signal,
    });

    if (!response.ok) {
        return { customers: [], orders: [] };
    }

    return response.json();
}
