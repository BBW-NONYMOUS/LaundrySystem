import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, Bell, BellOff, Info, OctagonAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { read, readAll } from '@/routes/notifications';
import type { AppNotification } from '@/types/models';

const levelIcon = {
    warning: { icon: AlertTriangle, className: 'text-warning' },
    destructive: { icon: OctagonAlert, className: 'text-destructive' },
    info: { icon: Info, className: 'text-info' },
} satisfies Record<
    AppNotification['level'],
    { icon: typeof Info; className: string }
>;

/**
 * In-app alerts (low stock, overdue digest) shared on every page by HandleInertiaRequests.
 */
export function NotificationBell() {
    const notifications = usePage().props.notifications;
    const [open, setOpen] = useState(false);

    if (!notifications) {
        return null;
    }

    const { unread_count: unread, latest } = notifications;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-8"
                    aria-label={
                        unread > 0
                            ? `${unread} unread notifications`
                            : 'Notifications'
                    }
                >
                    <Bell />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unread > 0 && (
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() =>
                                router.post(
                                    readAll.url(),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                {latest.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
                        <BellOff className="size-5" />
                        You're all caught up.
                    </div>
                ) : (
                    <ScrollArea className="max-h-80">
                        <ul className="divide-y">
                            {latest.map((notification) => {
                                const level =
                                    levelIcon[notification.level] ??
                                    levelIcon.info;

                                return (
                                    <li key={notification.id}>
                                        <button
                                            type="button"
                                            className="flex w-full gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                            onClick={() => {
                                                setOpen(false);
                                                router.post(
                                                    read.url(notification.id),
                                                );
                                            }}
                                        >
                                            <level.icon
                                                className={cn(
                                                    'mt-0.5 size-4 shrink-0',
                                                    level.className,
                                                )}
                                            />
                                            <span className="grid gap-0.5">
                                                <span className="text-sm font-medium">
                                                    {notification.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {notification.message}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {relative(
                                                        notification.created_at,
                                                    )}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </ScrollArea>
                )}
            </PopoverContent>
        </Popover>
    );
}
