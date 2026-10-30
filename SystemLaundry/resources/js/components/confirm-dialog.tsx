import type { ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

/**
 * Every delete / void / cancel / deactivate goes through this AlertDialog.
 * With `reasonLabel` it also collects the reason the server requires.
 *
 * `onConfirm` receives the reason and callbacks to report the outcome, so the dialog
 * stays open (showing the error) when the server rejects the action.
 */
export function ConfirmDialog({
    trigger,
    title,
    description,
    confirmLabel = 'Confirm',
    destructive = false,
    reasonLabel,
    reasonPlaceholder,
    onConfirm,
    open: controlledOpen,
    onOpenChange,
}: {
    trigger?: ReactNode;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    destructive?: boolean;
    /** Show a required reason field with this label. */
    reasonLabel?: string;
    reasonPlaceholder?: string;
    onConfirm: (
        reason: string,
        done: { onSuccess: () => void; onError: (message?: string) => void },
    ) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);
    const open = controlledOpen ?? internalOpen;

    const setOpen = (value: boolean) => {
        if (!value) {
            setReason('');
            setError(undefined);
        }

        setInternalOpen(value);
        onOpenChange?.(value);
    };

    const submit = () => {
        if (reasonLabel && reason.trim() === '') {
            setError('Please enter a reason.');

            return;
        }

        setProcessing(true);
        onConfirm(reason.trim(), {
            onSuccess: () => {
                setProcessing(false);
                setOpen(false);
            },
            onError: (message) => {
                setProcessing(false);
                setError(message ?? 'Something went wrong. Please try again.');
            },
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            {trigger && (
                <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && (
                        <AlertDialogDescription>
                            {description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>

                {reasonLabel && (
                    <div className="grid gap-2">
                        <Label htmlFor="confirm-reason">{reasonLabel}</Label>
                        <Textarea
                            id="confirm-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={reasonPlaceholder}
                            rows={3}
                            autoFocus
                        />
                    </div>
                )}

                <InputError message={error} />

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={processing}>
                        Cancel
                    </AlertDialogCancel>
                    {/* A plain Button (not AlertDialogAction) so the dialog stays open on errors. */}
                    <Button
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={submit}
                        disabled={processing}
                    >
                        {processing && <Spinner />}
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/**
 * Turn Inertia's validation error bag into one message for ConfirmDialog.
 */
export function firstError(errors: Record<string, string>): string | undefined {
    return Object.values(errors)[0];
}
