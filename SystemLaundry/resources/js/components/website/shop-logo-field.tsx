import { router, useForm, usePage } from '@inertiajs/react';
import { ImageUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { destroy, store } from '@/routes/shop/logo';

/**
 * Shop logo: uploads as soon as a file is chosen (its own request, separate from the
 * settings form). PNG, JPG or WebP up to 1 MB; SVG is refused by the server.
 */
export function ShopLogoField() {
    const { site } = usePage().props;
    const inputRef = useRef<HTMLInputElement>(null);
    const [removing, setRemoving] = useState(false);
    const form = useForm<{ logo: File | null }>({ logo: null });

    const upload = (file: File | undefined) => {
        if (!file) {
            return;
        }

        form.transform(() => ({ logo: file }));
        form.post(store.url(), {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            },
        });
    };

    return (
        <div className="grid gap-2">
            <Label htmlFor="shop-logo">Logo</Label>
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/50">
                    {site.logo_url ? (
                        <img
                            src={site.logo_url}
                            alt="Current shop logo"
                            className="size-full object-contain"
                        />
                    ) : (
                        <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-7 fill-current" />
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={inputRef}
                        id="shop-logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => upload(event.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing}
                        onClick={() => inputRef.current?.click()}
                    >
                        {form.processing ? <Spinner /> : <ImageUp />}
                        {site.logo_url ? 'Replace logo' : 'Upload logo'}
                    </Button>
                    {site.logo_url && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setRemoving(true)}
                        >
                            <Trash2 /> Remove
                        </Button>
                    )}
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                Square PNG, JPG or WebP, at least 256 × 256 px, up to 1 MB. A
                transparent background looks best. Without a logo, the
                washing-machine mark is used.
            </p>
            <InputError message={form.errors.logo} />

            <ConfirmDialog
                open={removing}
                onOpenChange={setRemoving}
                title="Remove the logo?"
                description="The website and login pages go back to the washing-machine mark."
                confirmLabel="Remove"
                destructive
                onConfirm={(_, done) =>
                    router.delete(destroy.url(), {
                        preserveScroll: true,
                        onSuccess: done.onSuccess,
                        onError: (errors) => done.onError(firstError(errors)),
                    })
                }
            />
        </div>
    );
}
