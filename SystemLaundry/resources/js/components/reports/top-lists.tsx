import { Link } from '@inertiajs/react';
import type { TopCustomer, TopService } from '@/components/reports/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useInitials } from '@/hooks/use-initials';
import { money, number, quantity } from '@/lib/format';
import { show as showCustomer } from '@/routes/customers';

/**
 * Best customers by amount spent (dashboard card and reports overview).
 */
export function TopCustomersList({ customers }: { customers: TopCustomer[] }) {
    const initials = useInitials();

    if (customers.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No orders in this period.
            </p>
        );
    }

    return (
        <ul className="divide-y">
            {customers.map((customer, index) => (
                <li
                    key={customer.customer_id}
                    className="flex items-center gap-3 py-2.5"
                >
                    <span className="w-4 text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                    </span>
                    <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                            {initials(customer.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <Link
                            href={showCustomer(customer.customer_id)}
                            className="block truncate text-sm font-medium hover:underline"
                        >
                            {customer.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            {number(customer.orders)}{' '}
                            {customer.orders === 1 ? 'order' : 'orders'}
                        </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                        {money(customer.spent)}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Services ranked by revenue, with quantity and order counts.
 */
export function TopServicesTable({ services }: { services: TopService[] }) {
    if (services.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No orders in this period.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {services.map((service) => (
                    <TableRow key={service.service}>
                        <TableCell className="font-medium">
                            {service.service}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {quantity(service.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {number(service.orders)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {money(service.revenue)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
