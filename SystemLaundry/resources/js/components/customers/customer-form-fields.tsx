import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type CustomerFormData = {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
};

/**
 * Name, mobile, email, address and notes — shared by the Add sheet and the Details tab.
 */
export function CustomerFormFields({
    data,
    setData,
    errors,
}: {
    data: CustomerFormData;
    setData: <K extends keyof CustomerFormData>(
        key: K,
        value: CustomerFormData[K],
    ) => void;
    errors: Partial<Record<keyof CustomerFormData, string>>;
}) {
    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="customer-name">Full name</Label>
                <Input
                    id="customer-name"
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    placeholder="e.g. Maria Santos"
                    autoComplete="off"
                    required
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="customer-phone">Mobile number</Label>
                <Input
                    id="customer-phone"
                    type="tel"
                    inputMode="tel"
                    value={data.phone}
                    onChange={(event) => setData('phone', event.target.value)}
                    placeholder="0917 123 4567"
                    className="font-mono"
                    required
                />
                <InputError message={errors.phone} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="customer-email">
                    Email{' '}
                    <span className="font-normal text-muted-foreground">
                        (optional)
                    </span>
                </Label>
                <Input
                    id="customer-email"
                    type="email"
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    placeholder="name@example.com"
                />
                <InputError message={errors.email} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="customer-address">
                    Address{' '}
                    <span className="font-normal text-muted-foreground">
                        (for pickup/delivery)
                    </span>
                </Label>
                <Textarea
                    id="customer-address"
                    value={data.address}
                    onChange={(event) => setData('address', event.target.value)}
                    rows={2}
                />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="customer-notes">Notes</Label>
                <Textarea
                    id="customer-notes"
                    value={data.notes}
                    onChange={(event) => setData('notes', event.target.value)}
                    placeholder="e.g. Prefers unscented fabric softener"
                    rows={2}
                />
                <InputError message={errors.notes} />
            </div>
        </div>
    );
}
