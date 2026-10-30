import { router } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { money, relative } from '@/lib/format';
import { show } from '@/routes/orders';
import type { Order } from '@/types/models';

/**
 * The latest orders on the dashboard; a row opens the order.
 */
export function RecentOrdersTable({ orders }: { orders: Order[] }) {
    if (orders.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="New orders will show up here."
            />
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                        Payment
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                        Created
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => (
                    <TableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() => router.visit(show(order.id))}
                    >
                        <TableCell className="font-mono text-xs font-medium">
                            {order.order_number}
                        </TableCell>
                        <TableCell className="max-w-40 truncate">
                            {order.customer?.name}
                        </TableCell>
                        <TableCell>
                            <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <PaymentBadge status={order.payment_status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {money(order.total_amount)}
                        </TableCell>
                        <TableCell className="hidden text-right text-sm text-muted-foreground sm:table-cell">
                            {relative(order.created_at)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
