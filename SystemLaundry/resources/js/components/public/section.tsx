import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Page-width wrapper used by every public section (max 1152 px). */
export function Container({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8',
                className,
            )}
        >
            {children}
        </div>
    );
}

/**
 * A full-width band. Sections alternate `default` (white) and `tint` (fresh-soft) so long
 * pages have a rhythm without borders (docs/public-site/04 §1.1).
 */
export function Section({
    id,
    tone = 'default',
    labelledBy,
    className,
    containerClassName,
    children,
}: {
    id?: string;
    tone?: 'default' | 'tint';
    labelledBy?: string;
    className?: string;
    containerClassName?: string;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={labelledBy}
            className={cn(
                'scroll-mt-20 py-16 md:py-24',
                tone === 'tint' && 'bg-fresh-soft',
                className,
            )}
        >
            <Container className={containerClassName}>{children}</Container>
        </section>
    );
}
