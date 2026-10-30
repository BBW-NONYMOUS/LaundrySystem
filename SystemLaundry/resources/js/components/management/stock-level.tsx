import { Progress } from '@/components/ui/progress';
import { quantity } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { InventoryItem } from '@/types/models';

/**
 * On-hand amount with a bar measured against 3× the reorder level:
 * red at/below the reorder level, amber within 1.5×, primary otherwise.
 */
export function StockLevel({ item }: { item: InventoryItem }) {
    const full = Math.max(item.reorder_level * 3, 1);
    const percent = Math.min((item.quantity_on_hand / full) * 100, 100);
    const tone =
        item.quantity_on_hand <= item.reorder_level
            ? 'destructive'
            : item.quantity_on_hand <= item.reorder_level * 1.5
              ? 'warning'
              : 'ok';

    return (
        <div className="grid w-36 gap-1">
            <span
                className={cn(
                    'text-sm font-medium tabular-nums',
                    tone === 'destructive' && 'text-destructive',
                    tone === 'warning' && 'text-warning',
                )}
            >
                {quantity(item.quantity_on_hand, item.unit)}
            </span>
            <Progress
                value={percent}
                aria-label={`${item.name} stock level`}
                className={cn(
                    'h-1.5',
                    tone === 'destructive' &&
                        'bg-destructive/15 [&>[data-slot=progress-indicator]]:bg-destructive',
                    tone === 'warning' &&
                        'bg-warning/15 [&>[data-slot=progress-indicator]]:bg-warning',
                )}
            />
        </div>
    );
}
