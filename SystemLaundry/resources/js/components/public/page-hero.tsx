import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Container } from '@/components/public/section';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

/**
 * Inner-page heading: breadcrumb, eyebrow, the page's one H1 and a lead paragraph.
 */
export function PageHero({
    breadcrumb,
    eyebrow,
    title,
    description,
    className,
    children,
}: {
    /** Current page name in the breadcrumb ("Home › {breadcrumb}"). */
    breadcrumb: string;
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div
            className={cn(
                'relative overflow-hidden border-b bg-linear-to-b from-fresh-soft to-background',
                className,
            )}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-fresh/15 blur-3xl"
            />
            <Container className="relative py-10 md:py-16">
                <Breadcrumb className="mb-6">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href={home()}>Home</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{breadcrumb}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex max-w-3xl flex-col gap-4">
                    {eyebrow && (
                        <p className="text-sm font-semibold text-fresh">
                            {eyebrow}
                        </p>
                    )}
                    <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-lg text-pretty text-muted-foreground md:text-xl">
                            {description}
                        </p>
                    )}
                </div>
                {children}
            </Container>
        </div>
    );
}
