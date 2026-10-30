import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    CircleHelp,
    ExternalLink,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FaqRow } from '@/components/website/types';
import { destroy, store, update } from '@/routes/faqs';
import { faq as publicFaq } from '@/routes/public';

type Props = {
    faqs: FaqRow[];
    categories: string[];
};

/** The Home page shows at most this many questions (Faq::forHome()). */
const HOME_LIMIT = 5;

/** Everything SaveFaqRequest accepts. */
function payloadFor(faq: FaqRow) {
    return {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sort_order: String(faq.sort_order),
        is_published: faq.is_published,
        show_on_home: faq.show_on_home,
    };
}

/**
 * Website FAQs (docs/public-site/04 §14.3): the /faq page, the Home preview and the
 * FAQ rich results in Google all read these rows.
 */
export default function FaqsIndex({ faqs, categories }: Props) {
    const [editing, setEditing] = useState<FaqRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<FaqRow | null>(null);
    const onHome = faqs.filter((faq) => faq.show_on_home).length;

    const toggle = (
        faq: FaqRow,
        key: 'is_published' | 'show_on_home',
        value: boolean,
    ) => {
        router.put(
            update.url(faq.id),
            { ...payloadFor(faq), [key]: value },
            { preserveScroll: true },
        );
    };

    const columns: ColumnDef<FaqRow>[] = [
        {
            id: 'sort_order',
            accessorKey: 'sort_order',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Order" />
            ),
            meta: { label: 'Order', className: 'w-16 tabular-nums' },
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.original.sort_order}
                </span>
            ),
        },
        {
            id: 'question',
            accessorKey: 'question',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Question" />
            ),
            meta: { label: 'Question' },
            enableHiding: false,
            cell: ({ row }) => (
                <div className="max-w-xl min-w-0">
                    <div className="font-medium">{row.original.question}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">
                        {row.original.answer}
                    </div>
                </div>
            ),
        },
        {
            id: 'category',
            accessorKey: 'category',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Category" />
            ),
            meta: { label: 'Category' },
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.category}</Badge>
            ),
        },
        {
            id: 'is_published',
            header: 'Published',
            meta: { label: 'Published' },
            enableSorting: false,
            cell: ({ row }) => (
                <Switch
                    checked={row.original.is_published}
                    onCheckedChange={(checked) =>
                        toggle(row.original, 'is_published', checked)
                    }
                    aria-label={`Publish “${row.original.question}”`}
                />
            ),
        },
        {
            id: 'show_on_home',
            header: 'On Home',
            meta: { label: 'On Home' },
            enableSorting: false,
            cell: ({ row }) => {
                const full = !row.original.show_on_home && onHome >= HOME_LIMIT;
                const control = (
                    <Switch
                        checked={row.original.show_on_home}
                        disabled={full}
                        onCheckedChange={(checked) =>
                            toggle(row.original, 'show_on_home', checked)
                        }
                        aria-label={`Show “${row.original.question}” on the Home page`}
                    />
                );

                if (!full) {
                    return control;
                }

                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>{control}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            The Home page shows {HOME_LIMIT} questions. Turn one
                            off first.
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            enableSorting: false,
            meta: { className: 'w-10' },
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Question actions"
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onSelect={() => setEditing(row.original)}
                        >
                            <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(row.original)}
                        >
                            <Trash2 /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <>
            <Head title="FAQs" />
            <PageBody>
                <PageHeader
                    title="FAQs"
                    description={`Questions on the website's FAQ page. ${onHome} of ${HOME_LIMIT} are shown on the Home page.`}
                >
                    <Button asChild variant="outline">
                        <a
                            href={publicFaq.url()}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink /> Preview
                        </a>
                    </Button>
                    <Button onClick={() => setEditing('new')}>
                        <Plus /> Add question
                    </Button>
                </PageHeader>

                <DataTable
                    tableId="faqs"
                    columns={columns}
                    data={faqs}
                    onRowClick={(faq) => setEditing(faq)}
                    rowClassName={(faq) =>
                        faq.is_published ? undefined : 'opacity-60'
                    }
                    emptyState={
                        <EmptyState
                            icon={CircleHelp}
                            title="No questions yet"
                            description="Add the questions customers ask most, like turnaround times and prices."
                            action={
                                <Button
                                    size="sm"
                                    onClick={() => setEditing('new')}
                                >
                                    <Plus /> Add question
                                </Button>
                            }
                        />
                    }
                />
            </PageBody>

            <FaqDialog
                faq={editing}
                categories={categories}
                homeFull={onHome >= HOME_LIMIT}
                onClose={() => setEditing(null)}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete this question?"
                description={`“${deleting?.question ?? ''}” will be removed from the website.`}
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

/**
 * Add / edit a question. Existing categories are offered as one-click chips.
 */
function FaqDialog({
    faq,
    categories,
    homeFull,
    onClose,
}: {
    faq: FaqRow | 'new' | null;
    categories: string[];
    homeFull: boolean;
    onClose: () => void;
}) {
    const isNew = faq === 'new';
    const blank = {
        question: '',
        answer: '',
        category: categories[0] ?? 'General',
        sort_order: '',
        is_published: true,
        show_on_home: false,
    };
    const form = useForm(blank);
    const [loadedFor, setLoadedFor] = useState<FaqRow | 'new' | null>(null);

    if (faq !== loadedFor) {
        setLoadedFor(faq);
        form.setData(faq && faq !== 'new' ? payloadFor(faq) : blank);
        form.clearErrors();
    }

    // Only block turning "On Home" on; an existing Home question can stay on.
    const homeBlocked = homeFull && !(faq && faq !== 'new' && faq.show_on_home);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        form.transform((data) => ({
            ...data,
            sort_order: data.sort_order === '' ? null : Number(data.sort_order),
        }));

        if (isNew) {
            form.post(store.url(), options);
        } else if (faq) {
            form.put(update.url(faq.id), options);
        }
    };

    return (
        <Dialog open={faq !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isNew ? 'Add question' : 'Edit question'}
                        </DialogTitle>
                        <DialogDescription>
                            Write it the way a customer would ask it.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="faq-question">Question</Label>
                        <Input
                            id="faq-question"
                            value={form.data.question}
                            onChange={(event) =>
                                form.setData('question', event.target.value)
                            }
                            placeholder="Do you pick up and deliver?"
                            maxLength={255}
                            autoFocus
                        />
                        <InputError message={form.errors.question} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="faq-answer">Answer</Label>
                        <Textarea
                            id="faq-answer"
                            rows={5}
                            maxLength={3000}
                            value={form.data.answer}
                            onChange={(event) =>
                                form.setData('answer', event.target.value)
                            }
                        />
                        <InputError message={form.errors.answer} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                        <div className="grid gap-2">
                            <Label htmlFor="faq-category">Category</Label>
                            <Input
                                id="faq-category"
                                value={form.data.category}
                                onChange={(event) =>
                                    form.setData('category', event.target.value)
                                }
                                maxLength={50}
                            />
                            {categories.length > 0 && (
                                <div
                                    className="flex flex-wrap gap-1.5"
                                    aria-label="Existing categories"
                                >
                                    {categories.map((category) => (
                                        <Button
                                            key={category}
                                            type="button"
                                            size="sm"
                                            variant={
                                                form.data.category === category
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                            className="h-7 px-2 text-xs"
                                            onClick={() =>
                                                form.setData(
                                                    'category',
                                                    category,
                                                )
                                            }
                                        >
                                            {category}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            <InputError message={form.errors.category} />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="faq-order">Order</Label>
                            <Input
                                id="faq-order"
                                type="number"
                                min={0}
                                value={form.data.sort_order}
                                onChange={(event) =>
                                    form.setData(
                                        'sort_order',
                                        event.target.value,
                                    )
                                }
                                placeholder={isNew ? 'Last' : undefined}
                                className="text-right tabular-nums"
                            />
                            <InputError message={form.errors.sort_order} />
                        </div>
                    </div>

                    <Label
                        htmlFor="faq-published"
                        className="flex items-center justify-between gap-4 font-normal"
                    >
                        <span className="grid gap-1">
                            <span className="font-medium">Published</span>
                            <span className="text-xs text-muted-foreground">
                                Shown on the FAQ page and in Google results.
                            </span>
                        </span>
                        <Switch
                            id="faq-published"
                            checked={form.data.is_published}
                            onCheckedChange={(checked) =>
                                form.setData('is_published', checked)
                            }
                        />
                    </Label>

                    <Label
                        htmlFor="faq-home"
                        className="flex items-center justify-between gap-4 font-normal"
                    >
                        <span className="grid gap-1">
                            <span className="font-medium">
                                Show on the Home page
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {homeBlocked
                                    ? `The Home page already shows ${HOME_LIMIT} questions.`
                                    : `Up to ${HOME_LIMIT} questions appear on Home.`}
                            </span>
                        </span>
                        <Switch
                            id="faq-home"
                            checked={form.data.show_on_home}
                            disabled={homeBlocked && !form.data.show_on_home}
                            onCheckedChange={(checked) =>
                                form.setData('show_on_home', checked)
                            }
                        />
                    </Label>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {isNew ? 'Add question' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
