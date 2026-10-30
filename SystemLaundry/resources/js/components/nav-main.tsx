import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavCountKey, NavGroup } from '@/lib/navigation';
import { toUrl } from '@/lib/utils';

/** Website inbox badges are informational (blue); overdue is urgent (red). */
const badgeColor: Partial<Record<NavCountKey, string>> = {
    overdue: 'text-destructive',
    bookings_pending: 'text-primary',
    messages_new: 'text-primary',
    reviews_pending: 'text-primary',
};

/**
 * One labeled sidebar group (Operations, Monitoring, ...) with optional count badges.
 */
export function NavMain({ group }: { group: NavGroup }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const counts = usePage().props.navCounts;

    return (
        <SidebarGroup className="py-1">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
                {group.items.map((item) => {
                    const count = item.badge && counts ? counts[item.badge] : 0;

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={
                                    !item.newTab &&
                                    isCurrentOrParentUrl(item.href)
                                }
                                tooltip={{ children: item.title }}
                            >
                                {item.newTab ? (
                                    <a
                                        href={toUrl(item.href)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </a>
                                ) : (
                                    <Link href={item.href} prefetch>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                )}
                            </SidebarMenuButton>
                            {count > 0 && (
                                <SidebarMenuBadge
                                    className={
                                        (item.badge &&
                                            badgeColor[item.badge]) ??
                                        'text-warning'
                                    }
                                >
                                    {count}
                                </SidebarMenuBadge>
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
