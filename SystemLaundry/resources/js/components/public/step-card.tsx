import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One "How it works" step. Desktop: a column joined to the next step by a dashed line.
 * Phone: a row with the line running down the left.
 */
export function StepCard({
    step,
    icon: Icon,
    title,
    text,
    last = false,
}: {
    step: number;
    icon: LucideIcon;
    title: string;
    text: string;
    last?: boolean;
}) {
    return (
        <li className="relative flex gap-4 pb-8 last:pb-0 md:flex-col md:items-center md:pb-0 md:text-center">
            {!last && (
                <span
                    aria-hidden
                    className={cn(
                        'absolute border-dashed border-fresh/40',
                        // Phone: vertical line under the icon. Desktop: horizontal line to the next step.
                        'top-14 bottom-0 left-7 border-l-2',
                        'md:top-7 md:right-[calc(-50%+2.25rem)] md:bottom-auto md:left-[calc(50%+2.25rem)] md:border-t-2 md:border-l-0',
                    )}
                />
            )}
            <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-fresh-soft text-fresh ring-1 ring-fresh/20">
                <Icon className="size-6" aria-hidden />
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {step}
                </span>
            </span>
            <div className="flex flex-col gap-1.5 pt-1 md:pt-0">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-pretty text-muted-foreground">{text}</p>
            </div>
        </li>
    );
}
