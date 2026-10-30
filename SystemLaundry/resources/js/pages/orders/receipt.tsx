import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileDown, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { dateTime, money, quantity } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show } from '@/routes/orders';
import { pdf } from '@/routes/orders/receipt';
import type { Order } from '@/types/models';

type Props = {
    order: Order;
    shop: {
        name: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        currency_symbol: string | null;
        receipt_footer: string | null;
    };
    trackingQrSvg: string;
    trackingUrl: string;
};

/**
 * Printable receipt (browser print). Mirrors resources/views/pdf/receipt.blade.php.
 * ?autoprint=1 opens the print dialog right away (used by New Order's "Save & print").
 */
export default function OrderReceipt({
    order,
    shop,
    trackingQrSvg,
    trackingUrl,
}: Props) {
    const { url } = usePage();
    const [paper, setPaper] = useState<'80mm' | 'a4'>('80mm');
    const peso = (amount: number | null) =>
        money(amount, shop.currency_symbol ?? '₱');
    const delivery = order.deliveries?.find((trip) => trip.type === 'delivery');
    const payments = (order.payments ?? []).filter(
        (payment) => !payment.is_voided,
    );

    useEffect(() => {
        if (
            new URL(url, window.location.origin).searchParams.get(
                'autoprint',
            ) === '1'
        ) {
            // Give fonts and the QR code a moment to render before printing.
            const timer = window.setTimeout(() => window.print(), 300);

            return () => window.clearTimeout(timer);
        }
        // Print once per page load only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Head title={`Receipt ${order.order_number}`} />

            <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 print:hidden">
                <Button variant="outline" asChild>
                    <Link href={show(order.id)}>
                        <ArrowLeft /> Back to order
                    </Link>
                </Button>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={paper}
                    onValueChange={(value) =>
                        value && setPaper(value as '80mm' | 'a4')
                    }
                >
                    <ToggleGroupItem value="80mm">80 mm</ToggleGroupItem>
                    <ToggleGroupItem value="a4">A4</ToggleGroupItem>
                </ToggleGroup>
                <Button onClick={() => window.print()}>
                    <Printer /> Print
                </Button>
                <Button variant="outline" asChild>
                    <a href={pdf.url(order.id)} target="_blank" rel="noopener">
                        <FileDown /> PDF
                    </a>
                </Button>
            </div>

            <article
                className={cn(
                    'mx-auto bg-white font-mono text-black shadow-sm print:shadow-none',
                    paper === '80mm'
                        ? 'w-[80mm] p-3 text-[11px] leading-snug print:w-[72mm] print:p-0'
                        : 'w-full max-w-[210mm] p-10 text-sm print:p-0',
                )}
            >
                <header className="text-center">
                    <h1
                        className={cn(
                            'font-sans font-bold',
                            paper === '80mm' ? 'text-base' : 'text-2xl',
                        )}
                    >
                        {shop.name}
                    </h1>
                    <p>{shop.address}</p>
                    <p>
                        {shop.phone}
                        {shop.email && ` · ${shop.email}`}
                    </p>
                </header>

                <Divider />

                <div className="text-center">
                    <p
                        className={cn(
                            'font-bold tracking-wide',
                            paper === '80mm' ? 'text-sm' : 'text-lg',
                        )}
                    >
                        {order.order_number}
                    </p>
                    {order.is_express && (
                        <span className="mt-1 inline-block border border-black px-1.5 font-bold">
                            EXPRESS
                        </span>
                    )}
                </div>

                <dl className="mt-2 space-y-0.5">
                    <Row label="Customer" value={order.customer?.name} strong />
                    <Row label="Mobile" value={order.customer?.phone} />
                    <Row
                        label="Received"
                        value={
                            order.received_at
                                ? dateTime(order.received_at)
                                : 'For pickup'
                        }
                    />
                    <Row
                        label="Ready by"
                        value={dateTime(order.due_at)}
                        strong
                    />
                    {delivery && (
                        <Row
                            label="Delivery"
                            value={dateTime(delivery.scheduled_at)}
                        />
                    )}
                    <Row label="Cashier" value={order.creator?.name} />
                </dl>

                <Divider />

                <table className="w-full">
                    <tbody>
                        {order.items?.map((item) => (
                            <tr key={item.id} className="align-top">
                                <td className="py-0.5">
                                    <div className="font-bold">
                                        {item.service_name}
                                    </div>
                                    <div>
                                        {quantity(
                                            item.quantity,
                                            item.unit_short,
                                        )}{' '}
                                        × {peso(item.unit_price)}
                                        {item.piece_count
                                            ? ` · ${item.piece_count} pcs`
                                            : ''}
                                    </div>
                                </td>
                                <td className="py-0.5 text-right">
                                    {peso(item.line_total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <Divider />

                <dl className="space-y-0.5">
                    <Row label="Subtotal" value={peso(order.subtotal)} />
                    {order.express_fee > 0 && (
                        <Row
                            label="Express fee"
                            value={peso(order.express_fee)}
                        />
                    )}
                    {order.delivery_fee > 0 && (
                        <Row
                            label="Pickup/Delivery"
                            value={peso(order.delivery_fee)}
                        />
                    )}
                    {order.discount_amount > 0 && (
                        <Row
                            label={`Discount (${order.discount_reason ?? ''})`}
                            value={`-${peso(order.discount_amount)}`}
                        />
                    )}
                    <Row
                        label="TOTAL"
                        value={peso(order.total_amount)}
                        strong
                        large={paper === 'a4'}
                    />
                </dl>

                {payments.length > 0 && (
                    <>
                        <Divider />
                        <div className="space-y-1">
                            {payments.map((payment) => (
                                <div key={payment.id}>
                                    <Row
                                        label={`${payment.method_label} · ${dateTime(payment.paid_at)}`}
                                        value={peso(payment.amount)}
                                    />
                                    {payment.amount_tendered !== null &&
                                        payment.change > 0 && (
                                            <Row
                                                label={`  Cash ${peso(payment.amount_tendered)} · Change`}
                                                value={peso(payment.change)}
                                            />
                                        )}
                                    {payment.reference_number && (
                                        <p className="pl-2">
                                            Ref: {payment.reference_number}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="mt-2">
                    <Row
                        label={
                            order.balance > 0 ? 'BALANCE DUE' : 'PAID IN FULL'
                        }
                        value={order.balance > 0 ? peso(order.balance) : ''}
                        strong
                        large={paper === 'a4'}
                    />
                </div>

                {order.special_instructions && (
                    <>
                        <Divider />
                        <p>
                            <span className="font-bold">Notes:</span>{' '}
                            {order.special_instructions}
                        </p>
                    </>
                )}

                <Divider />

                <div className="flex flex-col items-center gap-1 text-center">
                    {/* Server-generated SVG from QrCodeService (no user input). */}
                    <div
                        className={
                            paper === '80mm'
                                ? '[&_svg]:size-24'
                                : '[&_svg]:size-32'
                        }
                        dangerouslySetInnerHTML={{ __html: trackingQrSvg }}
                    />
                    <p>Scan to track your laundry</p>
                    <p className="text-[9px] break-all">{trackingUrl}</p>
                </div>

                {shop.receipt_footer && (
                    <>
                        <Divider />
                        <p className="text-center">{shop.receipt_footer}</p>
                    </>
                )}
            </article>
        </>
    );
}

function Divider() {
    return <hr className="my-2 border-0 border-t border-dashed border-black" />;
}

function Row({
    label,
    value,
    strong = false,
    large = false,
}: {
    label: string;
    value?: string | null;
    strong?: boolean;
    large?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex justify-between gap-2',
                strong && 'font-bold',
                large && 'text-base',
            )}
        >
            <dt className="whitespace-pre-wrap">{label}</dt>
            <dd className="text-right">{value ?? '—'}</dd>
        </div>
    );
}
