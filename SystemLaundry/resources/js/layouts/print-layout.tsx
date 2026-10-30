import type { ReactNode } from 'react';

/**
 * No app chrome: the receipt page prints exactly what is on screen
 * (controls inside the page use `print:hidden`).
 */
export default function PrintLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-muted p-4 md:p-8 print:bg-white print:p-0">
            {children}
        </div>
    );
}
