import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fades its content up 8 px the first time it scrolls into view (tw-animate-css, no
 * animation library). Visitors who ask for reduced motion see the content immediately.
 */
export function Reveal({
    className,
    delay = 0,
    children,
}: {
    className?: string;
    /** Milliseconds, for staggering cards in a grid. */
    delay?: number;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof IntersectionObserver === 'undefined') {
            setVisible(true);

            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '0px 0px -10% 0px' },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={
                visible && delay ? { animationDelay: `${delay}ms` } : undefined
            }
            className={cn(
                visible
                    ? 'motion-safe:animate-in motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:fade-in motion-safe:slide-in-from-bottom-2'
                    : 'motion-safe:opacity-0',
                className,
            )}
        >
            {children}
        </div>
    );
}
