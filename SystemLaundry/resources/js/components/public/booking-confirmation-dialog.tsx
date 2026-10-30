import { Link } from '@inertiajs/react';
import { Check, CircleCheck, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useClipboard } from '@/hooks/use-clipboard';
import { displayPhone } from '@/lib/public-site';
import { register } from '@/routes';
import type { BookingConfirmation } from '@/types/public';

/**
 * Shown after a guest booking is saved, with the reference number to quote on the phone.
 */
export function BookingConfirmationDialog({
    booking,
    onClose,
}: {
    booking: BookingConfirmation | null;
    onClose: () => void;
}) {
    const [copied, copy] = useClipboard();

    return (
        <Dialog
            open={booking !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                {booking && (
                    <>
                        <DialogHeader className="items-center text-center sm:text-center">
                            <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
                                <CircleCheck className="size-8" aria-hidden />
                            </span>
                            <DialogTitle className="text-xl">
                                Pickup request received!
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                We’ll text {displayPhone(booking.phone)} to
                                confirm your pickup on {booking.date},{' '}
                                {booking.window}. Keep your reference number in
                                case you need to call us.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Reference
                                </p>
                                <p className="font-mono text-lg font-semibold">
                                    {booking.reference}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void copy(booking.reference)}
                            >
                                {copied === booking.reference ? (
                                    <Check aria-hidden />
                                ) : (
                                    <Copy aria-hidden />
                                )}
                                {copied === booking.reference
                                    ? 'Copied'
                                    : 'Copy'}
                            </Button>
                        </div>

                        <DialogFooter className="gap-2 sm:flex-col">
                            <Button
                                type="button"
                                className="h-11"
                                onClick={onClose}
                            >
                                Done
                            </Button>
                            <Button asChild variant="outline" className="h-11">
                                <Link href={register()}>Create an account</Link>
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                See all your orders in one place.
                            </p>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
