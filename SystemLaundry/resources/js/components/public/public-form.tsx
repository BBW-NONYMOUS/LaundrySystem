import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

export type FieldAria = {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
};

/**
 * Label above the control, helper text and the server error underneath, all linked with
 * aria-describedby so screen readers read the error with the field.
 */
export function PublicField({
    id,
    label,
    description,
    error,
    optional = false,
    className,
    children,
}: {
    id: string;
    label: ReactNode;
    description?: ReactNode;
    error?: string;
    optional?: boolean;
    className?: string;
    children: (aria: FieldAria) => ReactNode;
}) {
    const describedBy =
        [description && `${id}-description`, error && `${id}-error`]
            .filter(Boolean)
            .join(' ') || undefined;

    return (
        <Field data-invalid={error ? true : undefined} className={className}>
            <FieldLabel htmlFor={id} className="text-sm font-medium">
                {label}
                {optional && (
                    <span className="font-normal text-muted-foreground">
                        (optional)
                    </span>
                )}
            </FieldLabel>
            {children({
                id,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': describedBy,
            })}
            {description && (
                <FieldDescription id={`${id}-description`}>
                    {description}
                </FieldDescription>
            )}
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
    );
}

/**
 * After a failed submit, move focus to the first field with an error (in form order).
 * Field ids are `${prefix}-${field name}`.
 */
export function focusFirstError(
    prefix: string,
    fieldOrder: string[],
    errors: Record<string, string | undefined>,
): void {
    const first = fieldOrder.find((field) => errors[field]);

    if (!first) {
        return;
    }

    window.requestAnimationFrame(() => {
        const element = document.getElementById(`${prefix}-${first}`);

        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        element?.focus({ preventScroll: true });
    });
}

/**
 * Hidden honeypot ("website") for bots. Real visitors never see or reach it; the
 * form_token time check is sent with the form data.
 */
export function HoneypotField({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div
            aria-hidden
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
        >
            <label>
                Website
                <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            </label>
        </div>
    );
}

/**
 * Errors that don't belong to one field (the spam check, rate limits).
 */
export function FormAlert({
    message,
    className,
}: {
    message?: string;
    className?: string;
}) {
    if (!message) {
        return null;
    }

    return (
        <Alert variant="destructive" className={cn(className)} role="alert">
            <AlertCircle />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}
