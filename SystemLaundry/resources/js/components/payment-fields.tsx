import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { money } from '@/lib/format';
import type { PaymentMethod, PaymentMethodOption } from '@/types/models';

export type PaymentValues = {
    method: PaymentMethod;
    amount: string;
    amount_tendered: string;
    reference_number: string;
};

/**
 * Change = cash received − amount paid (never negative). Mirrors PricingService::change().
 */
export function changeFor(values: PaymentValues): number {
    if (values.method !== 'cash' || values.amount_tendered === '') {
        return 0;
    }

    return Math.max(
        Number(values.amount_tendered) - Number(values.amount || 0),
        0,
    );
}

/** Next round bills a customer is likely to hand over, e.g. 457 → 500, 1000. */
function quickCash(amount: number): number[] {
    if (amount <= 0) {
        return [];
    }

    const options = new Set<number>();
    [100, 500, 1000].forEach((bill) =>
        options.add(Math.ceil(amount / bill) * bill),
    );

    return [...options]
        .filter((value) => value > amount)
        .sort((a, b) => a - b)
        .slice(0, 3);
}

/**
 * Method toggle + amount + cash received (quick-cash buttons) or reference number,
 * with the change shown large. Used by New Order, Record Payment and the rider's COD drawer.
 */
export function PaymentFields({
    values,
    onChange,
    methods,
    balance,
    errors = {},
    errorPrefix = '',
    currency = '₱',
    hideAmount = false,
}: {
    values: PaymentValues;
    onChange: (values: PaymentValues) => void;
    methods: PaymentMethodOption[];
    /** Amount still owed; the amount field defaults to it and can't exceed it. */
    balance: number;
    errors?: Record<string, string | undefined>;
    /** e.g. "payment." when errors come back as "payment.amount". */
    errorPrefix?: string;
    currency?: string;
    hideAmount?: boolean;
}) {
    const set = (patch: Partial<PaymentValues>) =>
        onChange({ ...values, ...patch });
    const amount = Number(values.amount || 0);
    const method = methods.find((option) => option.value === values.method);
    const change = changeFor(values);
    const short =
        values.method === 'cash' &&
        values.amount_tendered !== '' &&
        Number(values.amount_tendered) < amount;
    const error = (field: string) => errors[`${errorPrefix}${field}`];

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label>Payment method</Label>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={values.method}
                    onValueChange={(value) =>
                        value && set({ method: value as PaymentMethod })
                    }
                    className="flex w-full flex-wrap"
                >
                    {methods.map((option) => (
                        <ToggleGroupItem
                            key={option.value}
                            value={option.value}
                            className="flex-1 px-3"
                        >
                            {option.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <InputError message={error('method')} />
            </div>

            {!hideAmount && (
                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="payment-amount">Amount paid</Label>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => set({ amount: balance.toFixed(2) })}
                        >
                            Full balance {money(balance, currency)}
                        </Button>
                    </div>
                    <Input
                        id="payment-amount"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        max={balance}
                        value={values.amount}
                        onChange={(event) =>
                            set({ amount: event.target.value })
                        }
                        className="text-right text-base tabular-nums"
                    />
                    <InputError message={error('amount')} />
                </div>
            )}

            {values.method === 'cash' ? (
                <div className="grid gap-2">
                    <Label htmlFor="payment-tendered">Cash received</Label>
                    <Input
                        id="payment-tendered"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder={amount > 0 ? amount.toFixed(2) : '0.00'}
                        value={values.amount_tendered}
                        onChange={(event) =>
                            set({ amount_tendered: event.target.value })
                        }
                        className="text-right text-base tabular-nums"
                        aria-invalid={short || undefined}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                                set({ amount_tendered: amount.toFixed(2) })
                            }
                        >
                            Exact
                        </Button>
                        {quickCash(amount).map((bill) => (
                            <Button
                                key={bill}
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    set({ amount_tendered: String(bill) })
                                }
                            >
                                {money(bill, currency).replace('.00', '')}
                            </Button>
                        ))}
                    </div>
                    <InputError
                        message={
                            error('amount_tendered') ??
                            (short
                                ? 'Cash received is less than the amount.'
                                : undefined)
                        }
                    />
                    <div className="flex items-baseline justify-between rounded-lg bg-success/10 px-3 py-2">
                        <span className="text-sm font-medium text-success">
                            Change
                        </span>
                        <span className="text-2xl font-semibold text-success tabular-nums">
                            {money(change, currency)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="grid gap-2">
                    <Label htmlFor="payment-reference">
                        {method?.label ?? 'Reference'} reference no.
                    </Label>
                    <Input
                        id="payment-reference"
                        value={values.reference_number}
                        onChange={(event) =>
                            set({ reference_number: event.target.value })
                        }
                        placeholder="e.g. 1009 234 567 890"
                        className="font-mono"
                    />
                    <InputError message={error('reference_number')} />
                </div>
            )}
        </div>
    );
}
