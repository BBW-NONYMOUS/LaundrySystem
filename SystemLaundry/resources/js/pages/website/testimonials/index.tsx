import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Check,
    EyeOff,
    MoreHorizontal,
    Pencil,
    Plus,
    Star,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RatingStars } from '@/components/website/rating-stars';
import { StatusTabs } from '@/components/website/status-tabs';
import type { TestimonialRow } from '@/components/website/types';
import { date, number } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as showOrder } from '@/routes/orders';
import { destroy, store, update } from '@/routes/testimonials';
import type { Paginated, TableFilters } from '@/types/models';

type View = 'pending' | 'approved' | 'all';

type Props = {
    testimonials: Paginated<TestimonialRow>;
    filters: TableFilters & { view: View };
    counts: { pending: number; approved: number; featured: number };
    averageRating: number;
};

const ratingLabels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

/** Everything SaveTestimonialRequest accepts. */
function payloadFor(testimonial: TestimonialRow) {
    return {
        author_name: testimonial.author_name,
        rating: testimonial.rating,
        comment: testimonial.comment,
        is_approved: testimonial.is_approved,
        is_featured: testimonial.is_featured,
    };
}

function save(
    testimonial: TestimonialRow,
    changes: Partial<ReturnType<typeof payloadFor>>,
) {
    router.put(
        update.url(testimonial.id),
        { ...payloadFor(testimonial), ...changes },
        { preserveScroll: true },
    );
}

/**
 * Customer reviews (docs/public-site/04 §14.4). Reviews from the "Rate us" link wait
 * here until approved; only approved ones appear on the website, featured ones first.
 */
export default function TestimonialsIndex({
    testimonials,
    filters,
    counts,
    averageRating,
}: Props) {
    const [editing, setEditing] = useState<TestimonialRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<TestimonialRow | null>(null);
    const total = counts.pending + counts.approved;

    return (
        <>
            <Head title="Reviews" />
            <PageBody>
                <PageHeader
                    title="Reviews"
                    description={
                        total > 0 ? (
                            <span className="inline-flex flex-wrap items-center gap-x-2">
                                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                    <Star
                                        className="size-4 fill-current text-fresh"
                                        aria-hidden
                                    />
                                    {averageRating.toFixed(1)} average
                                </span>
                                <span>
                                    · {number(total)} reviews ·{' '}
                                    {number(counts.approved)} on the website ·{' '}
                                    {number(counts.featured)} featured
                                </span>
                            </span>
                        ) : (
                            'Customer reviews sent through the “Rate us” link after an order.'
                        )
                    }
                >
                    <Button onClick={() => setEditing('new')}>
                        <Plus /> Add review
                    </Button>
                </PageHeader>

                <StatusTabs
                    param="view"
                    value={filters.view}
                    label="Review status"
                    tabs={[
                        {
                            value: 'pending',
                            label: 'Waiting',
                            count: counts.pending,
                        },
                        {
                            value: 'approved',
                            label: 'Approved',
                            count: counts.approved,
                        },
                        { value: 'all', label: 'All' },
                    ]}
                />

                {testimonials.data.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={Star}
                            title={
                                filters.view === 'pending'
                                    ? 'No reviews waiting'
                                    : 'No reviews yet'
                            }
                            description={
                                filters.view === 'pending'
                                    ? 'New reviews from the “Rate us” link appear here for approval.'
                                    : 'Reviews appear after customers rate a finished order.'
                            }
                        />
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {testimonials.data.map((testimonial) => (
                            <ReviewCard
                                key={testimonial.id}
                                testimonial={testimonial}
                                onEdit={() => setEditing(testimonial)}
                                onDelete={() => setDeleting(testimonial)}
                            />
                        ))}
                    </div>
                )}

                {testimonials.meta.last_page > 1 && (
                    <DataTablePagination meta={testimonials.meta} />
                )}
            </PageBody>

            <ReviewDialog
                testimonial={editing}
                onClose={() => setEditing(null)}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete this review?"
                description="It will be removed for good. To keep it but take it off the website, hide it instead."
                confirmLabel="Delete"
                destructive
                onConfirm={(_, done) => {
                    if (!deleting) {
                        return;
                    }

                    router.delete(destroy.url(deleting.id), {
                        preserveScroll: true,
                        onSuccess: () => {
                            done.onSuccess();
                            setDeleting(null);
                        },
                        onError: (errors) => done.onError(firstError(errors)),
                    });
                }}
            />
        </>
    );
}

function ReviewCard({
    testimonial,
    onEdit,
    onDelete,
}: {
    testimonial: TestimonialRow;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <Card
            className={cn(
                'gap-4',
                testimonial.is_featured &&
                    'border-fresh/40 ring-1 ring-fresh/20',
            )}
        >
            <CardContent className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                    <RatingStars rating={testimonial.rating} />
                    <div className="flex flex-wrap justify-end gap-1.5">
                        {testimonial.is_featured && (
                            <Badge className="bg-fresh text-fresh-foreground">
                                Featured
                            </Badge>
                        )}
                        {testimonial.is_approved ? (
                            <Badge
                                variant="outline"
                                className="border-success/30 bg-success/10 text-success"
                            >
                                On website
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="border-warning/30 bg-warning/10 text-warning"
                            >
                                Waiting
                            </Badge>
                        )}
                    </div>
                </div>

                <blockquote className="text-sm leading-relaxed">
                    “{testimonial.comment}”
                </blockquote>

                <div className="text-sm">
                    <p className="font-medium">{testimonial.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                        {testimonial.source === 'manual'
                            ? 'Added manually'
                            : 'Rating link'}
                        {testimonial.created_at &&
                            ` · ${date(testimonial.created_at)}`}
                        {testimonial.order && (
                            <>
                                {' · '}
                                <Link
                                    href={showOrder(testimonial.order.id)}
                                    className="font-mono hover:text-primary hover:underline"
                                >
                                    {testimonial.order.order_number}
                                </Link>
                            </>
                        )}
                    </p>
                    {testimonial.customer &&
                        testimonial.customer.name !==
                            testimonial.author_name && (
                            <p className="text-xs text-muted-foreground">
                                Customer: {testimonial.customer.name}
                            </p>
                        )}
                </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-2 border-t">
                {testimonial.is_approved ? (
                    <Label
                        htmlFor={`featured-${testimonial.id}`}
                        className="flex items-center gap-2 text-sm font-normal"
                    >
                        <Switch
                            id={`featured-${testimonial.id}`}
                            checked={testimonial.is_featured}
                            onCheckedChange={(checked) =>
                                save(testimonial, { is_featured: checked })
                            }
                        />
                        Feature on Home
                    </Label>
                ) : (
                    <Button
                        size="sm"
                        onClick={() => save(testimonial, { is_approved: true })}
                    >
                        <Check /> Approve
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for review by ${testimonial.author_name}`}
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onEdit}>
                            <Pencil /> Edit
                        </DropdownMenuItem>
                        {testimonial.is_approved && (
                            <DropdownMenuItem
                                onSelect={() =>
                                    save(testimonial, {
                                        is_approved: false,
                                        is_featured: false,
                                    })
                                }
                            >
                                <EyeOff /> Hide from website
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={onDelete}
                        >
                            <Trash2 /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    );
}

/**
 * Add a review received elsewhere (Facebook, paper) or edit one. Names are shown as
 * first name and last initial on the website, e.g. "Maria S.".
 */
function ReviewDialog({
    testimonial,
    onClose,
}: {
    testimonial: TestimonialRow | 'new' | null;
    onClose: () => void;
}) {
    const isNew = testimonial === 'new';
    const blank = {
        author_name: '',
        rating: 5,
        comment: '',
        is_approved: true,
        is_featured: false,
    };
    const form = useForm(blank);
    const [loadedFor, setLoadedFor] = useState<TestimonialRow | 'new' | null>(
        null,
    );

    if (testimonial !== loadedFor) {
        setLoadedFor(testimonial);
        form.setData(
            testimonial && testimonial !== 'new'
                ? payloadFor(testimonial)
                : blank,
        );
        form.clearErrors();
    }

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (isNew) {
            form.post(store.url(), options);
        } else if (testimonial) {
            form.put(update.url(testimonial.id), options);
        }
    };

    return (
        <Dialog
            open={testimonial !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isNew ? 'Add review' : 'Edit review'}
                        </DialogTitle>
                        <DialogDescription>
                            {isNew
                                ? 'For reviews received on Facebook, by text or on paper.'
                                : 'Fix typos only — keep the customer’s words.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="review-name">Name shown</Label>
                        <Input
                            id="review-name"
                            value={form.data.author_name}
                            onChange={(event) =>
                                form.setData('author_name', event.target.value)
                            }
                            placeholder="Maria S."
                            maxLength={100}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            First name and last initial protects the customer’s
                            privacy.
                        </p>
                        <InputError message={form.errors.author_name} />
                    </div>

                    <div className="grid gap-2">
                        <Label id="review-rating-label">Rating</Label>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={String(form.data.rating)}
                            onValueChange={(value) =>
                                value && form.setData('rating', Number(value))
                            }
                            aria-labelledby="review-rating-label"
                            className="w-full"
                        >
                            {ratingLabels.map((label, index) => (
                                <ToggleGroupItem
                                    key={label}
                                    value={String(index + 1)}
                                    aria-label={`${index + 1} – ${label}`}
                                    className="flex-1 gap-1"
                                >
                                    {index + 1}
                                    <Star
                                        className={cn(
                                            'size-3.5',
                                            index < form.data.rating &&
                                                'fill-current text-fresh',
                                        )}
                                        aria-hidden
                                    />
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <InputError message={form.errors.rating} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="review-comment">Review</Label>
                        <Textarea
                            id="review-comment"
                            rows={4}
                            maxLength={1000}
                            value={form.data.comment}
                            onChange={(event) =>
                                form.setData('comment', event.target.value)
                            }
                        />
                        <InputError message={form.errors.comment} />
                    </div>

                    <Label
                        htmlFor="review-approved"
                        className="flex items-center justify-between gap-4 font-normal"
                    >
                        <span className="font-medium">Show on the website</span>
                        <Switch
                            id="review-approved"
                            checked={form.data.is_approved}
                            onCheckedChange={(checked) =>
                                form.setData((data) => ({
                                    ...data,
                                    is_approved: checked,
                                    is_featured: checked && data.is_featured,
                                }))
                            }
                        />
                    </Label>

                    <Label
                        htmlFor="review-featured"
                        className="flex items-center justify-between gap-4 font-normal"
                    >
                        <span className="grid gap-1">
                            <span className="font-medium">Feature on Home</span>
                            <span className="text-xs text-muted-foreground">
                                Featured reviews are shown first.
                            </span>
                        </span>
                        <Switch
                            id="review-featured"
                            checked={form.data.is_featured}
                            disabled={!form.data.is_approved}
                            onCheckedChange={(checked) =>
                                form.setData('is_featured', checked)
                            }
                        />
                    </Label>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {isNew ? 'Add review' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
