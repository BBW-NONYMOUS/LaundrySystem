import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * True while an Inertia visit is in flight (after a short delay, so fast responses
 * don't flash Skeletons). Used by data tables to show loading rows.
 */
export function useNavigationLoading(delay = 150): boolean {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer: number | undefined;

        const removeStart = router.on('start', () => {
            timer = window.setTimeout(() => setLoading(true), delay);
        });
        const removeFinish = router.on('finish', () => {
            window.clearTimeout(timer);
            setLoading(false);
        });

        return () => {
            window.clearTimeout(timer);
            removeStart();
            removeFinish();
        };
    }, [delay]);

    return loading;
}
