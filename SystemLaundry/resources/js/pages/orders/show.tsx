import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarClock,
    Check,
    ChevronDown,
    Copy,
    FileDown,
    MessageSquareText,
    MoreHorizontal,
    Pencil,
    Phone,
    Printer,
    QrCode,
    StickyNote,
    Truck,
    Wallet,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { OrderStepper } from '@/components/order-stepper';
import {
    EditItemsSheet,
    RecordPaymentDialog,
    ScheduleTripDialog,
} from '@/components/orders/order-dialogs';
import { PageBody } from '@/components/page-header';
import {
    DeliveryStatusBadge,
    ExpressBadge,
    OverdueBadge,
    PaymentBadge,
    StatusBadge,
} from '@/components/status-badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClipboard } from '@/hooks/use-clipboard';
import {
    dateTime,
    friendlyDateTime,
    money,
    quantity,
    relative,
} from '@/lib/format';
import { orderStatusStyles } from '@/lib/status';
import { cn } from '@/lib/utils';
import { show as showCustomer } from '@/routes/customers';
import { index, receipt, remind, show, tag } from '@/routes/orders';
import { pdf as receiptPdf } from '@/routes/orders/receipt';
import { update as updateStatus } from '@/routes/orders/status';
import { voidMethod } from '@/routes/payments';
import type {
    Option,
    Order,
    OrderStatus,
    Payment,
    PaymentMethodOption,
    Service,
    UserSummary,
} from '@/types/models';

type Props = {
    order: Order;
    nextStatuses: Option<OrderStatus>[];
    qrSvg: string;
    expressSurchargePercent: number;
    can: {
        update: boolean;
        updateStatus: boolean;
        cancel: boolean;
        pay: boolean;
        voidPayments: boolean;
        scheduleTrips: boolean;
        remind: boolean;
        override: boolean;
    };
    services?: Service[];
    riders?: UserSummary[];
    paymentMethods: PaymentMethodOption[];
};

/** Releasing laundry needs the balance settled (owner may override with a reason). */
const releaseStatuses: OrderStatus[] = ['completed', 'delivered'];

export default function OrderShow({
    order,
    nextStatuses,
    qrSvg,
    expressSurchargePercent,
    can,
    services,
    riders,
    paymentMethods,
}: Props) {
    const { url } = usePage();
    const [, copy] = useClipboard();
    const [copied, setCopied] = useState(false);
    const [payOpen, setPayOpen] = useState(
        () =>
            new URL(url, window.location.origin).searchParams.get('pay') ===
                '1' && can.pay,
    );
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    /** A status move that needs a reason: owner override or a failed delivery. */
    const [reasonFor, setReasonFor] = useState<Option<OrderStatus> | null>(
        null,
    );

    const transitions = nextStatuses.filter(
        (status) => status.value !== 'cancelled',
    );
    const primary = transitions[0];
    const delivery = order.deliveries?.find((trip) => trip.type === 'delivery');
    const pickup = order.deliveries?.find((trip) => trip.type === 'pickup');
    const blockedByBalance = (status: OrderStatus) =>
        releaseStatuses.includes(status) && order.balance > 0;

    const move = (status: Option<OrderStatus>) => {
        const failedDelivery =
            order.status === 'out_for_delivery' && status.value === 'ready';

        if (
            failedDelivery ||
            (blockedByBalance(status.value) && can.override)
        ) {
            setReasonFor(status);

            return;
        }

        router.post(
            updateStatus.url(order.id),
            { status: status.value },
            { preserveScroll: true },
        );
    };

    const copyNumber = async () => {
        if (await copy(order.order_number)) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        }
    };

    const moveButton = (status: Option<OrderStatus>) => {
        const Icon = orderStatusStyles[status.value].icon;
        const button = (
            <Button
                onClick={() => move(status)}
                disabled={blockedByBalance(status.value) && !can.override}
                className={orderStatusStyles[status.value].solid}
            >
                <Icon />
                Move to {status.label}
            </Button>
        );

        // Disabled buttons don't fire pointer events, so the Tooltip wraps a span.
        return blockedByBalance(status.value) && !can.override ? (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0}>{button}</span>
                </TooltipTrigger>
                <TooltipContent>
                    Collect {money(order.balance)} first
                </TooltipContent>
            </Tooltip>
        ) : (
            button
        );
    };

    return (
        <>
            <Head title={order.order_number} />
            <PageBody>
                {/* Header: number, badges, actions */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h1 className="font-mono text-2xl font-semibold tracking-tight">
                                {order.order_number}
                            </h1>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={copyNumber}
                                        aria-label="Copy order number"
                                    >
                                        {copied ? (
                                            <Check className="text-success" />
                                        ) : (
                                            <Copy />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {copied ? 'Copied' : 'Copy order number'}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={order.status} />
                            <PaymentBadge status={order.payment_status} />
                            {order.is_express && <ExpressBadge />}
                            {order.is_overdue && <OverdueBadge />}
                            <span className="text-sm text-muted-foreground">
                                Created {dateTime(order.created_at)}
                                {order.creator && ` by ${order.creator.name}`}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {can.updateStatus && primary && (
                            <div className="flex">
                                {moveButton(primary)}
                                {transitions.length > 1 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="ml-1"
                                                aria-label="Other status moves"
                                            >
                                                <ChevronDown />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>
                                                Move to…
                                            </DropdownMenuLabel>
                                            {transitions
                                                .slice(1)
                                                .map((status) => {
                                                    const Icon =
                                                        orderStatusStyles[
                                                            status.value
                                                        ].icon;

                                                    return (
                                                        <DropdownMenuItem
                                                            key={status.value}
                                                            disabled={
                                                                blockedByBalance(
                                                                    status.value,
                                                                ) &&
                                                                !can.override
                                                            }
                                                            onSelect={() =>
                                                                move(status)
                                                            }
                                                        >
                                                            <Icon />{' '}
                                                            {status.label}
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )}

                        {can.pay && (
                            <Button
                                variant="outline"
                                onClick={() => setPayOpen(true)}
                            >
                                <Wallet /> Payment
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Printer /> Print <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <a
                                        href={receipt.url(order.id)}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        <Printer /> Receipt
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={receiptPdf.url(order.id)}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        <FileDown /> Receipt PDF
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={tag.url(order.id)}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        <QrCode /> Bag tag
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {(can.update ||
                            can.scheduleTrips ||
                            can.remind ||
                            can.cancel) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="More actions"
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-52"
                                >
                                    {can.update && (
                                        <DropdownMenuItem
                                            onSelect={() => setEditOpen(true)}
                                        >
                                            <Pencil /> Edit items
                                        </DropdownMenuItem>
                                    )}
                                    {can.scheduleTrips && (
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                setScheduleOpen(true)
                                            }
                                        >
                                            <Truck /> Schedule pickup/delivery
                                        </DropdownMenuItem>
                                    )}
                                    {can.remind && (
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                router.post(
                                                    remind.url(order.id),
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Bell /> Send reminder
                                        </DropdownMenuItem>
                                    )}
                                    {can.cancel && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onSelect={() =>
                                                    setCancelOpen(true)
                                                }
                                            >
                                                <XCircle /> Cancel order
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <Card className="py-5">
                    <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
                        <OrderStepper
                            status={order.status}
                            history={order.status_histories}
                            hasDelivery={Boolean(delivery)}
                            className="flex-1"
                        />
                        {order.due_at &&
                            !['completed', 'delivered', 'cancelled'].includes(
                                order.status,
                            ) && (
                                <div
                                    className={cn(
                                        'shrink-0 text-sm md:pl-4 md:text-right',
                                        order.is_overdue
                                            ? 'text-destructive'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    <div className="font-medium">
                                        {order.is_overdue ? 'Overdue' : 'Due'}{' '}
                                        {relative(order.due_at)}
                                    </div>
                                    <div>{friendlyDateTime(order.due_at)}</div>
                                </div>
                            )}
                    </CardContent>
                </Card>

                {order.status === 'cancelled' && (
                    <Alert variant="destructive">
                        <XCircle />
                        <AlertTitle>
                            Cancelled {dateTime(order.cancelled_at)}
                        </AlertTitle>
                        <AlertDescription>
                            {order.cancellation_reason}
                        </AlertDescription>
                    </Alert>
                )}

                {order.special_instructions && (
                    <Alert>
                        <StickyNote />
                        <AlertTitle>Special instructions</AlertTitle>
                        <AlertDescription className="whitespace-pre-line">
                            {order.special_instructions}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_340px]">
                    {/* Left column */}
                    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Items</CardTitle>
                                {can.update && (
                                    <CardAction>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditOpen(true)}
                                        >
                                            <Pencil /> Edit
                                        </Button>
                                    </CardAction>
                                )}
                            </CardHeader>
                            <CardContent>
                                {(order.items ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No items yet — weigh the laundry when it
                                        arrives and add the items.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Service</TableHead>
                                                <TableHead className="text-right">
                                                    Qty
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Pcs
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Price
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Amount
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.items?.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">
                                                        {item.service_name}
                                                        {item.notes && (
                                                            <div className="text-xs font-normal text-muted-foreground">
                                                                {item.notes}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {quantity(
                                                            item.quantity,
                                                            item.unit_short,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {item.piece_count ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {money(item.unit_price)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {money(item.line_total)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Payments</CardTitle>
                                {can.pay && (
                                    <CardAction>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPayOpen(true)}
                                        >
                                            <Wallet /> Record payment
                                        </Button>
                                    </CardAction>
                                )}
                            </CardHeader>
                            <CardContent>
                                {(order.payments ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No payments yet.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Paid</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>By</TableHead>
                                                <TableHead className="text-right">
                                                    Amount
                                                </TableHead>
                                                {can.voidPayments && (
                                                    <TableHead className="w-16" />
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.payments?.map((payment) => (
                                                <PaymentRow
                                                    key={payment.id}
                                                    payment={payment}
                                                    canVoid={can.voidPayments}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ol className="relative space-y-4 border-l pl-5">
                                    {[...(order.status_histories ?? [])]
                                        .reverse()
                                        .map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="relative"
                                            >
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-background',
                                                        orderStatusStyles[
                                                            entry.to_status
                                                        ].dot,
                                                    )}
                                                />
                                                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                                                    <span className="font-medium">
                                                        {entry.to_label}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {dateTime(
                                                            entry.created_at,
                                                        )}
                                                        {entry.changed_by &&
                                                            ` · ${entry.changed_by}`}
                                                    </span>
                                                </div>
                                                {entry.notes && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {entry.notes}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                </ol>
                            </CardContent>
                        </Card>

                        <Accordion
                            type="single"
                            collapsible
                            className="rounded-xl border bg-card px-6"
                        >
                            <AccordionItem
                                value="messages"
                                className="border-b-0"
                            >
                                <AccordionTrigger>
                                    <span className="flex items-center gap-2">
                                        <MessageSquareText className="size-4" />
                                        Messages sent (
                                        {order.notification_logs?.length ?? 0})
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {(order.notification_logs ?? []).length ===
                                    0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No SMS or email sent yet.
                                        </p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {order.notification_logs?.map(
                                                (log) => (
                                                    <li
                                                        key={log.id}
                                                        className="space-y-1 rounded-lg border p-3 text-sm"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className="uppercase"
                                                            >
                                                                {log.channel}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    log.status ===
                                                                        'sent' &&
                                                                        'text-success',
                                                                    log.status ===
                                                                        'failed' &&
                                                                        'text-destructive',
                                                                )}
                                                            >
                                                                {log.status}
                                                            </Badge>
                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                {log.recipient}
                                                            </span>
                                                            <span className="ml-auto text-xs text-muted-foreground">
                                                                {dateTime(
                                                                    log.created_at,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p>{log.message}</p>
                                                        {log.error && (
                                                            <p className="text-xs text-destructive">
                                                                {log.error}
                                                            </p>
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-4 md:gap-6">
                        {order.customer && (
                            <Card>
                                <CardHeader>
                                    <CardDescription>Customer</CardDescription>
                                    <HoverCard>
                                        <HoverCardTrigger asChild>
                                            <Link
                                                href={showCustomer(
                                                    order.customer.id,
                                                )}
                                                className="text-lg font-semibold hover:underline"
                                            >
                                                {order.customer.name}
                                            </Link>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-72 space-y-1 text-sm">
                                            <p className="font-medium">
                                                {order.customer.name}
                                            </p>
                                            {order.customer.email && (
                                                <p className="text-muted-foreground">
                                                    {order.customer.email}
                                                </p>
                                            )}
                                            {order.customer.address && (
                                                <p className="text-muted-foreground">
                                                    {order.customer.address}
                                                </p>
                                            )}
                                            {order.customer.notes && (
                                                <p className="text-xs italic">
                                                    {order.customer.notes}
                                                </p>
                                            )}
                                        </HoverCardContent>
                                    </HoverCard>
                                </CardHeader>
                                <CardContent className="flex items-center gap-2">
                                    <span className="font-mono text-sm">
                                        {order.customer.phone}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() =>
                                            copy(order.customer!.phone)
                                        }
                                        aria-label="Copy mobile number"
                                    >
                                        <Copy />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        asChild
                                        aria-label="Call customer"
                                    >
                                        <a href={`tel:${order.customer.phone}`}>
                                            <Phone />
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <SummaryLine
                                    label="Subtotal"
                                    value={money(order.subtotal)}
                                />
                                {order.express_fee > 0 && (
                                    <SummaryLine
                                        label="Express fee"
                                        value={money(order.express_fee)}
                                    />
                                )}
                                {order.delivery_fee > 0 && (
                                    <SummaryLine
                                        label="Pickup/delivery"
                                        value={money(order.delivery_fee)}
                                    />
                                )}
                                {order.discount_amount > 0 && (
                                    <SummaryLine
                                        label={`Discount${order.discount_reason ? ` (${order.discount_reason})` : ''}`}
                                        value={`-${money(order.discount_amount)}`}
                                    />
                                )}
                                <Separator />
                                <SummaryLine
                                    label="Total"
                                    value={money(order.total_amount)}
                                    strong
                                />
                                <SummaryLine
                                    label="Paid"
                                    value={money(order.amount_paid)}
                                />
                                <div
                                    className={cn(
                                        'mt-2 flex items-baseline justify-between rounded-lg px-3 py-2',
                                        order.balance > 0
                                            ? 'bg-destructive/10 text-destructive'
                                            : 'bg-success/10 text-success',
                                    )}
                                >
                                    <span className="font-medium">
                                        {order.balance > 0
                                            ? 'Balance'
                                            : 'Paid in full'}
                                    </span>
                                    {order.balance > 0 && (
                                        <span className="text-2xl font-semibold tabular-nums">
                                            {money(order.balance)}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Pickup &amp; delivery</CardTitle>
                                {can.scheduleTrips && (
                                    <CardAction>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setScheduleOpen(true)
                                            }
                                        >
                                            <CalendarClock /> Schedule
                                        </Button>
                                    </CardAction>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {!pickup && !delivery && (
                                    <p className="text-muted-foreground">
                                        Walk-in — customer claims at the
                                        counter.
                                    </p>
                                )}
                                {[pickup, delivery]
                                    .filter((trip) => trip !== undefined)
                                    .map((trip) => (
                                        <div
                                            key={trip.id}
                                            className="space-y-1 rounded-lg border p-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">
                                                    {trip.type_label}
                                                </span>
                                                <DeliveryStatusBadge
                                                    status={trip.status}
                                                    label={trip.status_label}
                                                />
                                            </div>
                                            <p>
                                                {friendlyDateTime(
                                                    trip.scheduled_at,
                                                )}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {trip.address}
                                            </p>
                                            <p className="text-muted-foreground">
                                                Rider:{' '}
                                                {trip.rider?.name ??
                                                    'Not assigned'}
                                            </p>
                                            {trip.failure_reason && (
                                                <p className="text-xs text-destructive">
                                                    Last attempt failed:{' '}
                                                    {trip.failure_reason}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Bag tag</CardTitle>
                                <CardDescription>
                                    Staff scan this to update the status.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-3">
                                {/* Server-generated SVG from QrCodeService (no user input). */}
                                <div
                                    className="rounded-lg bg-white p-2 [&_svg]:size-36"
                                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                                />
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={tag.url(order.id)}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        <QrCode /> Print tag
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageBody>

            {can.pay && (
                <RecordPaymentDialog
                    order={order}
                    methods={paymentMethods}
                    open={payOpen}
                    onOpenChange={setPayOpen}
                />
            )}
            {can.scheduleTrips && (
                <ScheduleTripDialog
                    order={order}
                    riders={riders}
                    open={scheduleOpen}
                    onOpenChange={setScheduleOpen}
                />
            )}
            {can.update && (
                <EditItemsSheet
                    order={order}
                    services={services}
                    expressPercent={expressSurchargePercent}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}

            <ConfirmDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title={`Cancel ${order.order_number}?`}
                description="The order stays on record as Cancelled. Orders with payments must have them voided first."
                confirmLabel="Cancel order"
                destructive
                reasonLabel="Reason"
                reasonPlaceholder="e.g. Customer changed their mind"
                onConfirm={(reason, done) =>
                    router.post(
                        updateStatus.url(order.id),
                        { status: 'cancelled', notes: reason },
                        {
                            preserveScroll: true,
                            onSuccess: done.onSuccess,
                            onError: (errors) =>
                                done.onError(firstError(errors)),
                        },
                    )
                }
            />

            <ConfirmDialog
                open={reasonFor !== null}
                onOpenChange={(open) => !open && setReasonFor(null)}
                title={
                    order.status === 'out_for_delivery' &&
                    reasonFor?.value === 'ready'
                        ? 'Delivery failed?'
                        : `Release with ${money(order.balance)} unpaid?`
                }
                description={
                    order.status === 'out_for_delivery' &&
                    reasonFor?.value === 'ready'
                        ? 'The order goes back to Ready so the counter can reschedule it.'
                        : 'Owner override: the laundry is released while money is still owed. This is recorded in the audit trail.'
                }
                confirmLabel={
                    reasonFor ? `Move to ${reasonFor.label}` : 'Confirm'
                }
                reasonLabel="Reason"
                onConfirm={(reason, done) =>
                    reasonFor &&
                    router.post(
                        updateStatus.url(order.id),
                        { status: reasonFor.value, notes: reason },
                        {
                            preserveScroll: true,
                            onSuccess: done.onSuccess,
                            onError: (errors) =>
                                done.onError(firstError(errors)),
                        },
                    )
                }
            />
        </>
    );
}

function SummaryLine({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-baseline justify-between gap-2',
                strong && 'text-base font-semibold',
            )}
        >
            <span className={strong ? undefined : 'text-muted-foreground'}>
                {label}
            </span>
            <span className="tabular-nums">{value}</span>
        </div>
    );
}

function PaymentRow({
    payment,
    canVoid,
}: {
    payment: Payment;
    canVoid: boolean;
}) {
    return (
        <TableRow className={cn(payment.is_voided && 'text-muted-foreground')}>
            <TableCell className="whitespace-nowrap">
                {dateTime(payment.paid_at)}
            </TableCell>
            <TableCell>
                <div>{payment.method_label}</div>
                {payment.reference_number && (
                    <div className="font-mono text-xs text-muted-foreground">
                        {payment.reference_number}
                    </div>
                )}
                {payment.change > 0 && (
                    <div className="text-xs text-muted-foreground">
                        Cash {money(payment.amount_tendered)} · change{' '}
                        {money(payment.change)}
                    </div>
                )}
                {payment.is_voided && (
                    <div className="text-xs text-destructive">
                        Voided
                        {payment.voided_by &&
                            ` by ${payment.voided_by.name}`}:{' '}
                        {payment.void_reason}
                    </div>
                )}
            </TableCell>
            <TableCell>{payment.received_by?.name ?? '—'}</TableCell>
            <TableCell
                className={cn(
                    'text-right tabular-nums',
                    payment.is_voided && 'line-through',
                )}
            >
                {money(payment.amount)}
            </TableCell>
            {canVoid && (
                <TableCell className="text-right">
                    {!payment.is_voided && (
                        <ConfirmDialog
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                >
                                    Void
                                </Button>
                            }
                            title={`Void this ${money(payment.amount)} payment?`}
                            description={`The order's balance will go back up by ${money(payment.amount)}. The payment stays in the history as voided.`}
                            confirmLabel="Void payment"
                            destructive
                            reasonLabel="Reason"
                            reasonPlaceholder="e.g. Wrong amount entered"
                            onConfirm={(reason, done) =>
                                router.post(
                                    voidMethod.url(payment.id),
                                    { reason },
                                    {
                                        preserveScroll: true,
                                        onSuccess: done.onSuccess,
                                        onError: (errors) =>
                                            done.onError(firstError(errors)),
                                    },
                                )
                            }
                        />
                    )}
                </TableCell>
            )}
        </TableRow>
    );
}

OrderShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Orders', href: index() },
        { title: props.order.order_number, href: show(props.order.id) },
    ],
});
