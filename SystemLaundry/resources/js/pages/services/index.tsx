import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Info,
    MoreHorizontal,
    Pencil,
    Plus,
    Tags,
    Trash2,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageBody, PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { money, number } from '@/lib/format';
import { destroy, index, store, update } from '@/routes/services';
import type { Option, PricingUnit, Service } from '@/types/models';

type Props = {
    services: Service[];
    pricingUnits: Option<PricingUnit>[];
};

/** Everything SaveServiceRequest accepts, as strings for the inputs. */
function payloadFor(service: Service) {
    return {
        code: service.code,
        name: service.name,
        description: service.description ?? '',
        pricing_unit: service.pricing_unit,
        price: String(service.price),
        min_quantity: String(service.min_quantity),
        turnaround_hours: String(service.turnaround_hours),
        express_turnaround_hours:
            service.express_turnaround_hours === null
                ? ''
                : String(service.express_turnaround_hours),
        is_active: service.is_active,
        sort_order: String(service.sort_order),
    };
}

function hours(value: number | null): string {
    if (value === null) {
        return '—';
    }

    return value % 24 === 0
        ? `${value / 24} day${value === 24 ? '' : 's'}`
        : `${value} h`;
}

export default function ServicesIndex({ services, pricingUnits }: Props) {
    const [editing, setEditing] = useState<Service | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Service | null>(null);

    // Inline Active switch: send the full row back with is_active flipped.
    const toggleActive = (service: Service, active: boolean) => {
        router.put(
            update.url(service.id),
            { ...payloadFor(service), is_active: active },
            { preserveScroll: true },
        );
    };

    const columns: ColumnDef<Service>[] = [
        {
            id: 'code',
            accessorKey: 'code',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Code" />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs font-medium">
                    {row.original.code}
                </span>
            ),
            enableHiding: false,
        },
        {
            id: 'name',
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            meta: { label: 'Name' },
            cell: ({ row }) => (
                <div className="min-w-0">
                    <div className="font-medium">{row.original.name}</div>
                    {row.original.description && (
                        <div className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                            {row.original.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'pricing_unit',
            accessorKey: 'pricing_unit',
            header: 'Unit',
            meta: { label: 'Unit' },
            enableSorting: false,
            cell: ({ row }) => (
                <Badge variant="secondary">
                    {row.original.pricing_unit_label}
                </Badge>
            ),
        },
        {
            id: 'price',
            accessorKey: 'price',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Price"
                    className="justify-end"
                />
            ),
            meta: {
                label: 'Price',
                className: 'text-right',
                headerClassName: 'text-right',
            },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {money(row.original.price)}
                    <span className="text-muted-foreground">
                        {' '}
                        / {row.original.unit_short}
                    </span>
                </span>
            ),
        },
        {
            id: 'min_quantity',
            header: () => <div className="text-right">Minimum</div>,
            meta: { label: 'Minimum', className: 'text-right' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.min_quantity > 0
                        ? `${number(row.original.min_quantity)} ${row.original.unit_short}`
                        : '—'}
                </span>
            ),
        },
        {
            id: 'turnaround_hours',
            header: 'Turnaround',
            meta: { label: 'Turnaround' },
            enableSorting: false,
            cell: ({ row }) => hours(row.original.turnaround_hours),
        },
        {
            id: 'express_turnaround_hours',
            header: 'Express',
            meta: { label: 'Express' },
            enableSorting: false,
            cell: ({ row }) =>
                row.original.offers_express ? (
                    <span className="inline-flex items-center gap-1">
                        <Zap className="size-3.5 text-warning" aria-hidden />
                        {hours(row.original.express_turnaround_hours)}
                    </span>
                ) : (
                    <span className="text-muted-foreground">Not offered</span>
                ),
        },
        {
            id: 'is_active',
            header: 'Active',
            meta: { label: 'Active' },
            enableSorting: false,
            cell: ({ row }) => (
                <Switch
                    checked={row.original.is_active}
                    onCheckedChange={(checked) =>
                        toggleActive(row.original, checked)
                    }
                    aria-label={`${row.original.name} active`}
                />
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            enableSorting: false,
            meta: { className: 'w-10' },
            cell: ({ row }) => (
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
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onSelect={() => setEditing(row.original)}
                        >
                            <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(row.original)}
                        >
                            <Trash2 /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <>
            <Head title="Services & pricing" />
            <PageBody>
                <PageHeader
                    title="Services & pricing"
                    description="What the shop offers and how each service is charged."
                >
                    <Button onClick={() => setEditing('new')}>
                        <Plus />
                        Add service
                    </Button>
                </PageHeader>

                <DataTable
                    tableId="services"
                    columns={columns}
                    data={services}
                    onRowClick={(service) => setEditing(service)}
                    rowClassName={(service) =>
                        service.is_active ? undefined : 'opacity-60'
                    }
                    emptyState={
                        <EmptyState
                            icon={Tags}
                            title="No services yet"
                            description="Add the services the shop offers, like Wash, Dry & Fold."
                            action={
                                <Button
                                    size="sm"
                                    onClick={() => setEditing('new')}
                                >
                                    <Plus /> Add service
                                </Button>
                            }
                        />
                    }
                />
            </PageBody>

            <ServiceDialog
                service={editing}
                pricingUnits={pricingUnits}
                onClose={() => setEditing(null)}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Delete ${deleting?.name ?? 'service'}?`}
                description={
                    deleting && (deleting.order_items_count ?? 0) > 0
                        ? `This service was used on ${number(deleting.order_items_count ?? 0)} past orders, so it will be deactivated instead of deleted. Old receipts stay unchanged.`
                        : 'This service has never been used and will be removed permanently.'
                }
                confirmLabel={
                    deleting && (deleting.order_items_count ?? 0) > 0
                        ? 'Deactivate'
                        : 'Delete'
                }
                destructive
                onConfirm={(_, done) => {
                    if (!deleting) {
                        return;
                    }

                    router.delete(destroy.url(deleting.id), {
                        preserveScroll: true,
                        onSuccess: () => {
                            done.onSuccess();
                            setDeleting(null);
                        },
                        onError: (errors) => done.onError(firstError(errors)),
                    });
                }}
            />
        </>
    );
}

/**
 * Add / edit form. Prices only affect new orders; existing orders keep their snapshot.
 */
function ServiceDialog({
    service,
    pricingUnits,
    onClose,
}: {
    service: Service | 'new' | null;
    pricingUnits: Option<PricingUnit>[];
    onClose: () => void;
}) {
    const isNew = service === 'new';
    const blank = {
        code: '',
        name: '',
        description: '',
        pricing_unit: 'per_kg' as PricingUnit,
        price: '',
        min_quantity: '0',
        turnaround_hours: '24',
        express_turnaround_hours: '',
        is_active: true,
        sort_order: '0',
    };
    const form = useForm(blank);
    const [loadedFor, setLoadedFor] = useState<Service | 'new' | null>(null);

    // Load the selected service into the form each time the dialog opens.
    if (service !== loadedFor) {
        setLoadedFor(service);
        form.setData(
            service && service !== 'new' ? payloadFor(service) : blank,
        );
        form.clearErrors();
    }

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (isNew) {
            form.post(store.url(), options);
        } else if (service) {
            form.put(update.url(service.id), options);
        }
    };

    const unitShort = form.data.pricing_unit === 'per_kg' ? 'kg' : 'pc';

    return (
        <Dialog
            open={service !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isNew ? 'Add service' : 'Edit service'}
                        </DialogTitle>
                        <DialogDescription>
                            Shown on the New Order screen and on receipts.
                        </DialogDescription>
                    </DialogHeader>

                    {!isNew && (
                        <Alert>
                            <Info />
                            <AlertDescription>
                                Existing orders keep the price they were
                                charged.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="service-code">Code</Label>
                            <Input
                                id="service-code"
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="WDF"
                                className="font-mono"
                                maxLength={20}
                                autoFocus
                            />
                            <InputError message={form.errors.code} />
                        </div>
                        <div className="col-span-2 grid gap-2">
                            <Label htmlFor="service-name">Name</Label>
                            <Input
                                id="service-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                placeholder="Wash, Dry & Fold"
                            />
                            <InputError message={form.errors.name} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="service-description">
                            Description (optional)
                        </Label>
                        <Textarea
                            id="service-description"
                            rows={2}
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                        />
                        <InputError message={form.errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Charged</Label>
                        <RadioGroup
                            value={form.data.pricing_unit}
                            onValueChange={(value) =>
                                form.setData(
                                    'pricing_unit',
                                    value as PricingUnit,
                                )
                            }
                            className="grid grid-cols-2 gap-2"
                        >
                            {pricingUnits.map((unit) => (
                                <Label
                                    key={unit.value}
                                    htmlFor={`unit-${unit.value}`}
                                    className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                >
                                    <RadioGroupItem
                                        id={`unit-${unit.value}`}
                                        value={unit.value}
                                    />
                                    {unit.label}
                                </Label>
                            ))}
                        </RadioGroup>
                        <InputError message={form.errors.pricing_unit} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="service-price">
                                Price per {unitShort} (₱)
                            </Label>
                            <Input
                                id="service-price"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={form.data.price}
                                onChange={(event) =>
                                    form.setData('price', event.target.value)
                                }
                                className="text-right tabular-nums"
                            />
                            <InputError message={form.errors.price} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="service-min">
                                Minimum ({unitShort})
                            </Label>
                            <Input
                                id="service-min"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                value={form.data.min_quantity}
                                onChange={(event) =>
                                    form.setData(
                                        'min_quantity',
                                        event.target.value,
                                    )
                                }
                                className="text-right tabular-nums"
                            />
                            <InputError message={form.errors.min_quantity} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="service-turnaround">
                                Turnaround (hours)
                            </Label>
                            <Input
                                id="service-turnaround"
                                type="number"
                                min="1"
                                value={form.data.turnaround_hours}
                                onChange={(event) =>
                                    form.setData(
                                        'turnaround_hours',
                                        event.target.value,
                                    )
                                }
                                className="text-right tabular-nums"
                            />
                            <InputError
                                message={form.errors.turnaround_hours}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="service-express">
                                Express (hours)
                            </Label>
                            <Input
                                id="service-express"
                                type="number"
                                min="1"
                                value={form.data.express_turnaround_hours}
                                onChange={(event) =>
                                    form.setData(
                                        'express_turnaround_hours',
                                        event.target.value,
                                    )
                                }
                                placeholder="Not offered"
                                className="text-right tabular-nums"
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty = express not offered.
                            </p>
                            <InputError
                                message={form.errors.express_turnaround_hours}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <Label
                            htmlFor="service-active"
                            className="flex items-center gap-2 font-normal"
                        >
                            <Switch
                                id="service-active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', checked)
                                }
                            />
                            Available on new orders
                        </Label>
                        <div className="flex items-center gap-2">
                            <Label
                                htmlFor="service-order"
                                className="text-xs text-muted-foreground"
                            >
                                Display order
                            </Label>
                            <Input
                                id="service-order"
                                type="number"
                                min="0"
                                value={form.data.sort_order}
                                onChange={(event) =>
                                    form.setData(
                                        'sort_order',
                                        event.target.value,
                                    )
                                }
                                className="h-8 w-20 text-right tabular-nums"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {isNew ? 'Add service' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

ServicesIndex.layout = {
    breadcrumbs: [{ title: 'Services & pricing', href: index() }],
};
