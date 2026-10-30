import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { navGroups, newOrderLink } from '@/lib/navigation';
import { dashboard } from '@/routes';

/**
 * sidebar-07 block: collapsible to icons, menu built from the user's permissions.
 */
export function AppSidebar() {
    const { can } = usePermissions();

    const groups = navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => can(...item.can)),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {can(...newOrderLink.can) && (
                        <SidebarMenuItem className="mt-1">
                            <SidebarMenuButton
                                asChild
                                tooltip={{
                                    children: `${newOrderLink.title} (Alt+N)`,
                                }}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                            >
                                <Link href={newOrderLink.href} prefetch>
                                    <newOrderLink.icon />
                                    <span className="font-medium">
                                        {newOrderLink.title}
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {groups.map((group) => (
                    <NavMain key={group.label} group={group} />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
