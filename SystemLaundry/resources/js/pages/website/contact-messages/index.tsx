import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Inbox,
    Mail,
    MailOpen,
    Phone,
    RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { StatusTabs } from '@/components/website/status-tabs';
import { countOf } from '@/components/website/types';
import type {
    ContactMessageRow,
    ContactMessageStatus,
    StatusCounts,
} from '@/components/website/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { dateTime, relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { update } from '@/routes/contact-messages';
import type { Paginated, TableFilters } from '@/types/models';

type Props = {
    messages: Paginated<ContactMessageRow>;
    filters: TableFilters & { status?: ContactMessageStatus | null };
    counts: StatusCounts;
};

const statusBadge: Record<ContactMessageStatus, string> = {
    new: 'border-primary/30 bg-primary/10 text-primary',
    read: 'border-border text-muted-foreground',
    resolved: 'border-success/30 bg-success/10 text-success',
};

function setStatus(message: ContactMessageRow, status: ContactMessageStatus) {
    router.patch(
        update.url(message.id),
        { status },
        { preserveScroll: true, preserveState: true },
    );
}

/**
 * Contact-form inbox (docs/public-site/04 §14.2). Opening a message marks it read;
 * staff mark it resolved once they've replied by phone or email.
 */
export default function ContactMessagesIndex({
    messages,
    filters,
    counts,
}: Props) {
    const isMobile = useIsMobile();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected =
        messages.data.find((message) => message.id === selectedId) ?? null;
    const total =
        countOf(counts, 'new') +
        countOf(counts, 'read') +
        countOf(counts, 'resolved');

    const open = (message: ContactMessageRow) => {
        setSelectedId(message.id);

        if (message.status === 'new') {
            setStatus(message, 'read');
        }
    };

    return (
        <>
            <Head title="Messages" />
            <PageBody>
                <PageHeader
                    title="Messages"
                    description="Messages sent through the website contact form."
                />

                <StatusTabs
                    param="status"
                    value={filters.status ?? 'all'}
                    label="Message status"
                    tabs={[
                        { value: 'all', label: 'All', count: total },
                        {
                            value: 'new',
                            label: 'New',
                            count: countOf(counts, 'new'),
                        },
                        {
                            value: 'read',
                            label: 'Read',
                            count: countOf(counts, 'read'),
                        },
                        {
                            value: 'resolved',
                            label: 'Resolved',
                            count: countOf(counts, 'resolved'),
                        },
                    ]}
                />

                {messages.data.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={Inbox}
                            title="No messages here"
                            description="Messages from the website contact form will appear here."
                        />
                    </Card>
                ) : (
                    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        <Card className="gap-0 overflow-hidden py-0">
                            <ul className="divide-y" aria-label="Messages">
                                {messages.data.map((message) => (
                                    <li key={message.id}>
                                        <button
                                            type="button"
                                            onClick={() => open(message)}
                                            aria-current={
                                                selected?.id === message.id
                                                    ? 'true'
                                                    : undefined
                                            }
                                            className={cn(
                                                'grid w-full gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none',
                                                selected?.id === message.id &&
                                                    !isMobile &&
                                                    'bg-muted',
                                            )}
                                        >
                                            <span className="flex items-center justify-between gap-3">
                                                <span
                                                    className={cn(
                                                        'truncate text-sm',
                                                        message.status === 'new'
                                                            ? 'font-semibold'
                                                            : 'font-medium',
                                                    )}
                                                >
                                                    {message.status ===
                                                        'new' && (
                                                        <span
                                                            className="mr-2 inline-block size-2 rounded-full bg-primary"
                                                            aria-label="Unread"
                                                        />
                                                    )}
                                                    {message.name}
                                                </span>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {relative(
                                                        message.created_at,
                                                    )}
                                                </span>
                                            </span>
                                            <span className="truncate text-sm">
                                                {message.subject ?? 'No topic'}
                                            </span>
                                            <span className="line-clamp-1 text-xs text-muted-foreground">
                                                {message.message}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        {!isMobile && (
                            <Card className="sticky top-4 py-0">
                                <CardContent className="p-5">
                                    {selected ? (
                                        <MessageDetail message={selected} />
                                    ) : (
                                        <EmptyState
                                            icon={MailOpen}
                                            title="Select a message to read it"
                                            description="Opening a message marks it as read."
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {messages.meta.last_page > 1 && (
                    <DataTablePagination meta={messages.meta} />
                )}
            </PageBody>

            {isMobile && (
                <Sheet
                    open={selected !== null}
                    onOpenChange={(value) => !value && setSelectedId(null)}
                >
                    <SheetContent side="bottom" className="max-h-[90svh]">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Message</SheetTitle>
                            <SheetDescription>
                                From {selected?.name}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="overflow-y-auto p-4">
                            {selected && <MessageDetail message={selected} />}
                        </div>
                    </SheetContent>
                </Sheet>
            )}
        </>
    );
}

/**
 * The full message with reply shortcuts and status actions.
 */
function MessageDetail({ message }: { message: ContactMessageRow }) {
    const subject = message.subject ?? 'Your message';
    const mailto = message.email
        ? `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`
        : null;

    return (
        <article className="grid gap-4">
            <header className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{message.name}</h2>
                    <Badge
                        variant="outline"
                        className={statusBadge[message.status]}
                    >
                        {message.status_label}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {subject} · {dateTime(message.created_at)}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {message.phone && (
                        <a
                            href={`tel:${message.phone}`}
                            className="inline-flex items-center gap-1.5 hover:text-primary"
                        >
                            <Phone className="size-3.5" aria-hidden />
                            {message.phone}
                        </a>
                    )}
                    {message.email && (
                        <a
                            href={`mailto:${message.email}`}
                            className="inline-flex items-center gap-1.5 break-all hover:text-primary"
                        >
                            <Mail className="size-3.5" aria-hidden />
                            {message.email}
                        </a>
                    )}
                </div>
            </header>

            <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">
                {message.message}
            </p>

            {message.handled_by && (
                <p className="text-xs text-muted-foreground">
                    {message.status === 'resolved' && message.resolved_at
                        ? `Resolved by ${message.handled_by} · ${dateTime(message.resolved_at)}`
                        : `Last handled by ${message.handled_by}`}
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                {message.phone && (
                    <Button asChild variant="outline">
                        <a href={`tel:${message.phone}`}>
                            <Phone /> Call
                        </a>
                    </Button>
                )}
                {mailto && (
                    <Button asChild variant="outline">
                        <a href={mailto}>
                            <Mail /> Reply by email
                        </a>
                    </Button>
                )}
                {message.status !== 'resolved' ? (
                    <Button onClick={() => setStatus(message, 'resolved')}>
                        <CheckCircle2 /> Mark as resolved
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        onClick={() => setStatus(message, 'read')}
                    >
                        <RotateCcw /> Reopen
                    </Button>
                )}
                {message.status !== 'new' && (
                    <Button
                        variant="ghost"
                        onClick={() => setStatus(message, 'new')}
                    >
                        <MailOpen /> Mark as unread
                    </Button>
                )}
            </div>
        </article>
    );
}
