import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { quantity } from '@/lib/format';
import { store } from '@/routes/inventory/movements';
import type { InventoryItem, StockMovementType } from '@/types/models';

const typeLabels: Record<StockMovementType, string> = {
    in: 'Stock in',
    out: 'Stock out',
    adjustment: 'Adjust',
};

/**
 * Record a stock in / stock out / adjustment for one supply.
 * Staff without inventory.manage only get "Stock out" (the server enforces this too).
 */
export function StockMovementDialog({
    item,
    canManage,
    defaultType = 'out',
    onOpenChange,
}: {
    item: InventoryItem | null;
    canManage: boolean;
    defaultType?: StockMovementType;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({
        type: (canManage ? defaultType : 'out') as StockMovementType,
        quantity: '',
        remarks: '',
        order_number: '',
    });

    useEffect(() => {
        if (item) {
            form.setData({
                type: canManage ? defaultType : 'out',
                quantity: '',
                remarks: '',
                order_number: '',
            });
            form.clearErrors();
        }
        // Reset whenever the dialog opens for an item.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item, defaultType]);

    const types: StockMovementType[] = canManage
        ? ['in', 'out', 'adjustment']
        : ['out'];
    const isAdjust = form.data.type === 'adjustment';

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!item) {
            return;
        }

        form.post(store.url(item.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={item !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Record stock movement</DialogTitle>
                        <DialogDescription>
                            {item?.name} ·{' '}
                            {item
                                ? quantity(item.quantity_on_hand, item.unit)
                                : ''}{' '}
                            on hand
                        </DialogDescription>
                    </DialogHeader>

                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={form.data.type}
                        onValueChange={(value) =>
                            value &&
                            form.setData('type', value as StockMovementType)
                        }
                        className="w-full"
                    >
                        {types.map((type) => (
                            <ToggleGroupItem
                                key={type}
                                value={type}
                                className="flex-1"
                            >
                                {typeLabels[type]}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <InputError message={form.errors.type} />

                    <div className="grid gap-2">
                        <Label htmlFor="movement-quantity">
                            Quantity ({item?.unit})
                        </Label>
                        <Input
                            id="movement-quantity"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min={isAdjust ? undefined : '0'}
                            value={form.data.quantity}
                            onChange={(event) =>
                                form.setData('quantity', event.target.value)
                            }
                            className="text-right tabular-nums"
                            autoFocus
                        />
                        {isAdjust && (
                            <p className="text-xs text-muted-foreground">
                                Positive if you found extra, negative if spilled
                                or missing.
                            </p>
                        )}
                        <InputError message={form.errors.quantity} />
                    </div>

                    {form.data.type === 'out' && (
                        <div className="grid gap-2">
                            <Label htmlFor="movement-order">
                                Order # (optional)
                            </Label>
                            <Input
                                id="movement-order"
                                value={form.data.order_number}
                                onChange={(event) =>
                                    form.setData(
                                        'order_number',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="LND-20261023-0001"
                                className="font-mono"
                            />
                            <InputError message={form.errors.order_number} />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="movement-remarks">
                            Remarks{isAdjust ? '' : ' (optional)'}
                        </Label>
                        <Textarea
                            id="movement-remarks"
                            rows={2}
                            value={form.data.remarks}
                            onChange={(event) =>
                                form.setData('remarks', event.target.value)
                            }
                            placeholder={
                                isAdjust
                                    ? 'e.g. Physical count correction'
                                    : 'e.g. Supplier delivery'
                            }
                        />
                        <InputError message={form.errors.remarks} />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
