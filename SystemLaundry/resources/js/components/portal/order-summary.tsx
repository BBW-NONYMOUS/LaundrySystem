import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { money, quantity } from '@/lib/format';
import type { Order } from '@/types/models';

/**
 * Items + totals block for the customer-facing order page.
 */
export function OrderItemsTable({ order }: { order: Order }) {
    const items = order.items ?? [];

    if (items.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                We'll add your items after weighing your laundry at the shop.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="font-medium">
                                {item.service_name}
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                                {money(item.unit_price)} / {item.unit_short}
                                {item.piece_count
                                    ? ` · ${item.piece_count} pcs`
                                    : ''}
                            </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {quantity(item.quantity, item.unit_short)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {money(item.line_total)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function OrderTotals({ order }: { order: Order }) {
    const rows: [string, number][] = [
        ['Subtotal', order.subtotal],
        ...(order.express_fee > 0
            ? [['Express fee', order.express_fee] as [string, number]]
            : []),
        ...(order.delivery_fee > 0
            ? [['Pickup / delivery', order.delivery_fee] as [string, number]]
            : []),
        ...(order.discount_amount > 0
            ? [
                  [
                      `Discount${order.discount_reason ? ` (${order.discount_reason})` : ''}`,
                      -order.discount_amount,
                  ] as [string, number],
              ]
            : []),
    ];

    return (
        <dl className="grid gap-2 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular-nums">{money(value)}</dd>
                </div>
            ))}
            <Separator className="my-1" />
            <div className="flex justify-between gap-4 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.total_amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="tabular-nums">{money(order.amount_paid)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-base font-semibold">
                <dt>{order.balance > 0 ? 'Balance due' : 'Balance'}</dt>
                <dd
                    className={
                        order.balance > 0
                            ? 'text-destructive tabular-nums'
                            : 'text-success tabular-nums'
                    }
                >
                    {order.balance > 0 ? money(order.balance) : 'Paid'}
                </dd>
            </div>
        </dl>
    );
}
