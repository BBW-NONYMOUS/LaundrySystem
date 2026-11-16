import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const reasons = [
    'Customer requested',
    'Rider unavailable',
    'Bad weather',
    'Nobody was home',
];

/**
 * Why a trip is being moved: one tap on a common reason, or type one.
 * The customer sees it in their SMS and on their order page.
 */
export function RescheduleReasonField({
    id,
    value,
    onChange,
    error,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <div className="grid gap-2 rounded-lg border border-dashed p-3">
            <Label htmlFor={id}>Reason for rescheduling</Label>
            <ToggleGroup
                type="single"
                variant="outline"
                value={reasons.includes(value) ? value : ''}
                onValueChange={(next) => next && onChange(next)}
                className="grid w-full grid-cols-2"
            >
                {reasons.map((reason) => (
                    <ToggleGroupItem
                        key={reason}
                        value={reason}
                        className="rounded-md! border! text-xs"
                    >
                        {reason}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Tap a reason above or type one"
                maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
                The customer is told the new time and this reason by SMS.
            </p>
            <InputError message={error} />
        </div>
    );
}
