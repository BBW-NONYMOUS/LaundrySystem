import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    MoreHorizontal,
    Pencil,
    Power,
    PowerOff,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageBody, PageHeader } from '@/components/page-header';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { dateTime, number, relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { index, store, toggleActive, update } from '@/routes/users';
import type {
    Option,
    Paginated,
    StaffUser,
    TableFilters,
    UserRole,
} from '@/types/models';

type Props = {
    users: Paginated<StaffUser>;
    filters: TableFilters;
    roles: Option<UserRole>[];
};

/** One line per role so the owner knows what each account can do. */
const roleDescriptions: Partial<Record<UserRole, string>> = {
    admin: 'Owner — everything, including reports, prices, users and settings.',
    cashier:
        'Front desk — customers, orders, payments, deliveries and the daily summary.',
    staff: 'Laundry staff — updates processing status and records supply usage.',
    rider: 'Delivery rider — sees and completes their own pickups and deliveries.',
};

const roleBadge: Partial<Record<UserRole, string>> = {
    admin: 'border-primary/30 bg-primary/10 text-primary',
    cashier: 'border-info/30 bg-info/10 text-info',
    staff: 'border-status-washing/30 bg-status-washing/10 text-status-washing',
    rider: 'border-status-out-for-delivery/30 bg-status-out-for-delivery/10 text-status-out-for-delivery',
};

export default function UsersIndex({ users, filters, roles }: Props) {
    const currentUserId = usePage().props.auth.user.id;
    const getInitials = useInitials();
    const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);
    const [toggling, setToggling] = useState<StaffUser | null>(null);

    const columns: ColumnDef<StaffUser>[] = [
        {
            id: 'name',
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                            {getInitials(row.original.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium">
                            {row.original.name}
                            {row.original.id === currentUserId && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                    (you)
                                </span>
                            )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground md:hidden">
                            {row.original.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'email',
            accessorKey: 'email',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Email" />
            ),
            meta: { label: 'Email' },
            cell: ({ row }) => (
                <span className="text-sm">{row.original.email}</span>
            ),
        },
        {
            id: 'phone',
            header: 'Mobile',
            meta: { label: 'Mobile' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="font-mono text-xs">
                    {row.original.phone ?? '—'}
                </span>
            ),
        },
        {
            id: 'role',
            header: 'Role',
            meta: { label: 'Role' },
            enableSorting: false,
            cell: ({ row }) =>
                row.original.role ? (
                    <Badge
                        variant="outline"
                        className={roleBadge[row.original.role]}
                    >
                        {row.original.role_label}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            id: 'is_active',
            header: 'Status',
            meta: { label: 'Status' },
            enableSorting: false,
            cell: ({ row }) =>
                row.original.is_active ? (
                    <Badge
                        variant="outline"
                        className="border-success/30 bg-success/10 text-success"
                    >
                        Active
                    </Badge>
                ) : (
                    <Badge variant="secondary">Deactivated</Badge>
                ),
        },
        {
            id: 'last_login_at',
            accessorKey: 'last_login_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Last login" />
            ),
            meta: { label: 'Last login' },
            cell: ({ row }) =>
                row.original.last_login_at ? (
                    <Tooltip>
                        <TooltipTrigger className="text-sm">
                            {relative(row.original.last_login_at)}
                        </TooltipTrigger>
                        <TooltipContent>
                            {dateTime(row.original.last_login_at)}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-sm text-muted-foreground">Never</span>
                ),
        },
        {
            id: 'actions',
            enableHiding: false,
            enableSorting: false,
            meta: { className: 'w-10' },
            cell: ({ row }) => {
                const isSelf = row.original.id === currentUserId;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${row.original.name}`}
                            >
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                                onSelect={() => setEditing(row.original)}
                            >
                                <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={isSelf}
                                variant={
                                    row.original.is_active
                                        ? 'destructive'
                                        : 'default'
                                }
                                onSelect={() => setToggling(row.original)}
                            >
                                {row.original.is_active ? (
                                    <PowerOff />
                                ) : (
                                    <Power />
                                )}
                                {row.original.is_active
                                    ? 'Deactivate'
                                    : 'Reactivate'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <>
            <Head title="Users" />
            <PageBody>
                <PageHeader
                    title="Users"
                    description={`${number(users.meta.total)} staff accounts`}
                >
                    <Button onClick={() => setEditing('new')}>
                        <UserPlus />
                        Add staff
                    </Button>
                </PageHeader>

                <DataTable
                    tableId="users"
                    columns={columns}
                    data={users.data}
                    meta={users.meta}
                    filters={filters}
                    initialVisibility={{ phone: false }}
                    onRowClick={(user) => setEditing(user)}
                    rowClassName={(user) => cn(!user.is_active && 'opacity-60')}
                    toolbar={(table) => (
                        <DataTableToolbar
                            table={table}
                            searchPlaceholder="Name or email…"
                            filterKeys={['role', 'active']}
                        >
                            <DataTableFacetedFilter
                                paramKey="role"
                                title="Role"
                                single
                                options={roles.map((role) => ({
                                    value: role.value,
                                    label: role.label,
                                }))}
                            />
                            <DataTableFacetedFilter
                                paramKey="active"
                                title="Status"
                                single
                                options={[
                                    { value: '1', label: 'Active' },
                                    { value: '0', label: 'Deactivated' },
                                ]}
                            />
                        </DataTableToolbar>
                    )}
                    emptyState={
                        <EmptyState
                            icon={Users}
                            title="No staff found"
                            description="Try a different search or filter."
                        />
                    }
                />
            </PageBody>

            <UserSheet
                user={editing}
                roles={roles}
                isSelf={editing !== 'new' && editing?.id === currentUserId}
                onClose={() => setEditing(null)}
            />

            <ConfirmDialog
                open={toggling !== null}
                onOpenChange={(open) => !open && setToggling(null)}
                title={
                    toggling?.is_active
                        ? `Deactivate ${toggling.name}?`
                        : `Reactivate ${toggling?.name ?? ''}?`
                }
                description={
                    toggling?.is_active
                        ? 'They are signed out and can no longer log in. Their name stays on every order and payment they handled.'
                        : 'They will be able to log in again with their existing password.'
                }
                confirmLabel={toggling?.is_active ? 'Deactivate' : 'Reactivate'}
                destructive={toggling?.is_active}
                onConfirm={(_, done) => {
                    if (!toggling) {
                        return;
                    }

                    router.patch(
                        toggleActive.url(toggling.id),
                        {},
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                done.onSuccess();
                                setToggling(null);
                            },
                            onError: (errors) =>
                                done.onError(firstError(errors)),
                        },
                    );
                }}
            />
        </>
    );
}

/**
 * Add / edit a staff account. Password is required for new accounts, optional when editing.
 */
function UserSheet({
    user,
    roles,
    isSelf,
    onClose,
}: {
    user: StaffUser | 'new' | null;
    roles: Option<UserRole>[];
    isSelf: boolean;
    onClose: () => void;
}) {
    const isNew = user === 'new';
    const blank = {
        name: '',
        email: '',
        phone: '',
        role: 'cashier' as UserRole,
        password: '',
        password_confirmation: '',
    };
    const form = useForm(blank);
    const [loadedFor, setLoadedFor] = useState<StaffUser | 'new' | null>(null);

    // Fill the form each time the sheet opens for a different user.
    if (user !== loadedFor) {
        setLoadedFor(user);
        form.setData(
            user && user !== 'new'
                ? {
                      name: user.name,
                      email: user.email,
                      phone: user.phone ?? '',
                      role: user.role ?? 'cashier',
                      password: '',
                      password_confirmation: '',
                  }
                : blank,
        );
        form.clearErrors();
    }

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (isNew) {
            form.post(store.url(), options);
        } else if (user) {
            form.put(update.url(user.id), options);
        }
    };

    return (
        <Sheet open={user !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <form onSubmit={submit} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>
                            {isNew ? 'Add staff account' : 'Edit staff account'}
                        </SheetTitle>
                        <SheetDescription>
                            {isNew
                                ? 'They can log in right away with the password you set.'
                                : 'Leave the password empty to keep the current one.'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="grid flex-1 gap-4 px-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user-name">Full name</Label>
                            <Input
                                id="user-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                autoComplete="off"
                                autoFocus
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-email">Email (login)</Label>
                            <Input
                                id="user-email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData(
                                        'email',
                                        event.target.value.toLowerCase(),
                                    )
                                }
                                autoComplete="off"
                            />
                            <InputError message={form.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-phone">
                                Mobile (optional)
                            </Label>
                            <Input
                                id="user-phone"
                                type="tel"
                                inputMode="tel"
                                value={form.data.phone}
                                onChange={(event) =>
                                    form.setData('phone', event.target.value)
                                }
                                placeholder="0917 123 4567"
                            />
                            <InputError message={form.errors.phone} />
                        </div>

                        <Separator />

                        <div className="grid gap-2">
                            <Label>Role</Label>
                            <RadioGroup
                                value={form.data.role}
                                onValueChange={(value) =>
                                    form.setData('role', value as UserRole)
                                }
                                className="grid gap-2"
                                disabled={isSelf}
                            >
                                {roles.map((role) => (
                                    <Label
                                        key={role.value}
                                        htmlFor={`role-${role.value}`}
                                        className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                    >
                                        <RadioGroupItem
                                            id={`role-${role.value}`}
                                            value={role.value}
                                            className="mt-0.5"
                                        />
                                        <span className="grid gap-0.5">
                                            <span className="font-medium">
                                                {role.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {roleDescriptions[role.value]}
                                            </span>
                                        </span>
                                    </Label>
                                ))}
                            </RadioGroup>
                            {isSelf && (
                                <p className="text-xs text-muted-foreground">
                                    You can't change your own role.
                                </p>
                            )}
                            <InputError message={form.errors.role} />
                        </div>

                        <Separator />

                        <div className="grid gap-2">
                            <Label htmlFor="user-password">
                                {isNew ? 'Password' : 'New password (optional)'}
                            </Label>
                            <PasswordInput
                                id="user-password"
                                value={form.data.password}
                                onChange={(event) =>
                                    form.setData('password', event.target.value)
                                }
                                autoComplete="new-password"
                            />
                            <InputError message={form.errors.password} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-password-confirmation">
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="user-password-confirmation"
                                value={form.data.password_confirmation}
                                onChange={(event) =>
                                    form.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <SheetFooter className="flex-row justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {isNew ? 'Create account' : 'Save changes'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'Users', href: index() }],
};
