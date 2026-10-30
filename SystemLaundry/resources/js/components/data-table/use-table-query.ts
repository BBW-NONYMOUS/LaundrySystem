import { router, usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';

type ParamValue = string | number | boolean | null | undefined;

/**
 * Reads and writes the list state (search, filters, sort, page) in the URL query string.
 * Every change is a partial Inertia visit, so the server does the filtering/paging and
 * the current view can be bookmarked or shared.
 */
export function useTableQuery(only?: string[]) {
    const { url } = usePage();

    const params = useMemo(
        () => new URL(url, window.location.origin).searchParams,
        [url],
    );

    const get = useCallback((key: string) => params.get(key), [params]);

    const setParams = useCallback(
        (changes: Record<string, ParamValue>) => {
            const next = new URLSearchParams(params);

            Object.entries(changes).forEach(([key, value]) => {
                if (
                    value === null ||
                    value === undefined ||
                    value === '' ||
                    value === false
                ) {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            });

            // Any filter change starts again from the first page.
            if (!('page' in changes)) {
                next.delete('page');
            }

            router.get(window.location.pathname, Object.fromEntries(next), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only,
            });
        },
        [params, only],
    );

    const reset = useCallback(
        (keep: string[] = []) => {
            const kept = Object.fromEntries(
                [...params.entries()].filter(([key]) => keep.includes(key)),
            );

            router.get(window.location.pathname, kept, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only,
            });
        },
        [params, only],
    );

    return { params, get, setParams, reset };
}
