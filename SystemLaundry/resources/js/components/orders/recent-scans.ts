/**
 * Order numbers scanned on this device, newest first (per-browser convenience only).
 */
const KEY = 'scan:recent';
const LIMIT = 8;

export type RecentScan = {
    orderNumber: string;
    customer: string | null;
    at: string;
};

export function readRecentScans(): RecentScan[] {
    try {
        const raw = window.localStorage.getItem(KEY);

        return raw ? (JSON.parse(raw) as RecentScan[]) : [];
    } catch {
        return [];
    }
}

export function rememberScan(scan: RecentScan): void {
    try {
        const others = readRecentScans().filter(
            (entry) => entry.orderNumber !== scan.orderNumber,
        );
        window.localStorage.setItem(
            KEY,
            JSON.stringify([scan, ...others].slice(0, LIMIT)),
        );
    } catch {
        // Storage blocked (private mode): the list just won't be kept.
    }
}
