import { useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { store, update } from '@/routes/inventory';
import type { InventoryItem } from '@/types/models';

/**
 * Add a supply (with opening stock) or edit its details. Stock levels themselves only
 * change through movements, so editing never touches quantity_on_hand.
 */
export function InventoryItemDialog({
    item,
    units,
    onClose,
}: {
    /** 'new' to add, an item to edit, null when closed. */
    item: InventoryItem | 'new' | null;
    units: string[];
    onClose: () => void;
}) {
    const isNew = item === 'new';
    const blank = {
        sku: '',
        name: '',
        unit: 'pcs',
        reorder_level: '0',
        unit_cost: '',
        is_active: true,
        opening_quantity: '',
    };
    const form = useForm(blank);
    const [loadedFor, setLoadedFor] = useState<InventoryItem | 'new' | null>(
        null,
    );

    // Fill the form each time the dialog opens for a different item.
    if (item !== loadedFor) {
        setLoadedFor(item);
        form.setData(
            item && item !== 'new'
                ? {
                      sku: item.sku,
                      name: item.name,
                      unit: item.unit,
                      reorder_level: String(item.reorder_level),
                      unit_cost:
                          item.unit_cost === null ? '' : String(item.unit_cost),
                      is_active: item.is_active,
                      opening_quantity: '',
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
        } else if (item) {
            // opening_quantity is prohibited on update.
            form.transform(({ opening_quantity: _ignored, ...data }) => data);
            form.put(update.url(item.id), options);
        }
    };

    return (
        <Dialog
            open={item !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isNew ? 'Add supply item' : 'Edit supply item'}
                        </DialogTitle>
                        <DialogDescription>
                            {isNew
                                ? 'Opening stock is recorded as the first “Stock in” entry.'
                                : 'Use Stock in / out / Adjust to change the quantity.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="item-sku">SKU</Label>
                            <Input
                                id="item-sku"
                                value={form.data.sku}
                                onChange={(event) =>
                                    form.setData(
                                        'sku',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="SUP-SOFT"
                                className="font-mono"
                                autoFocus
                            />
                            <InputError message={form.errors.sku} />
                        </div>
                        <div className="col-span-2 grid gap-2">
                            <Label htmlFor="item-name">Name</Label>
                            <Input
                                id="item-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                placeholder="Fabric conditioner"
                            />
                            <InputError message={form.errors.name} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="item-unit">Unit</Label>
                            <Select
                                value={form.data.unit}
                                onValueChange={(value) =>
                                    form.setData('unit', value)
                                }
                            >
                                <SelectTrigger
                                    id="item-unit"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit} value={unit}>
                                            {unit}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.unit} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="item-reorder">Reorder at</Label>
                            <Input
                                id="item-reorder"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.reorder_level}
                                onChange={(event) =>
                                    form.setData(
                                        'reorder_level',
                                        event.target.value,
                                    )
                                }
                                className="text-right tabular-nums"
                            />
                            <InputError message={form.errors.reorder_level} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="item-cost">Unit cost ₱</Label>
                            <Input
                                id="item-cost"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.unit_cost}
                                onChange={(event) =>
                                    form.setData(
                                        'unit_cost',
                                        event.target.value,
                                    )
                                }
                                className="text-right tabular-nums"
                            />
                            <InputError message={form.errors.unit_cost} />
                        </div>
                    </div>

                    {isNew && (
                        <div className="grid gap-2">
                            <Label htmlFor="item-opening">
                                Opening stock ({form.data.unit})
                            </Label>
                            <Input
                                id="item-opening"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.opening_quantity}
                                onChange={(event) =>
                                    form.setData(
                                        'opening_quantity',
                                        event.target.value,
                                    )
                                }
                                placeholder="0"
                                className="text-right tabular-nums"
                            />
                            <InputError
                                message={form.errors.opening_quantity}
                            />
                        </div>
                    )}

                    <Label
                        htmlFor="item-active"
                        className="flex items-center gap-2 font-normal"
                    >
                        <Switch
                            id="item-active"
                            checked={form.data.is_active}
                            onCheckedChange={(checked) =>
                                form.setData('is_active', checked)
                            }
                        />
                        Active (counts toward low-stock alerts)
                    </Label>

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
                            {isNew ? 'Add item' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
