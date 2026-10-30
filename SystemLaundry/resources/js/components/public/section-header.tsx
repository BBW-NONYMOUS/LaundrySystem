import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Eyebrow · H2 · lead paragraph. Centered on Home, left-aligned on inner pages.
 * Pass `id` and use it as the section's aria-labelledby.
 */
export function SectionHeader({
    id,
    eyebrow,
    title,
    description,
    align = 'center',
    className,
}: {
    id?: string;
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'center' | 'left';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'mb-10 flex max-w-2xl flex-col gap-3 md:mb-12',
                align === 'center' && 'mx-auto items-center text-center',
                className,
            )}
        >
            {eyebrow && (
                <p className="text-sm font-semibold text-fresh">{eyebrow}</p>
            )}
            <h2
                id={id}
                className="text-3xl font-semibold tracking-tight text-balance md:text-4xl"
            >
                {title}
            </h2>
            {description && (
                <p className="text-lg text-pretty text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    );
}
