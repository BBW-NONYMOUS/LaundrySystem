import { Head, Link, router } from '@inertiajs/react';
import { History, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { readRecentScans } from '@/components/orders/recent-scans';
import { PageBody, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { relative } from '@/lib/format';
import { index, show } from '@/routes/scan';

/**
 * Barcode/QR scanners "type" the tag content and press Enter, so a focused input is
 * all a scanner needs. Staff can also type an order number by hand.
 */
export default function ScanIndex() {
    const [code, setCode] = useState('');
    const [recent] = useState(readRecentScans);

    const submit = () => {
        if (code.trim() !== '') {
            router.get(index.url(), { code: code.trim() });
        }
    };

    return (
        <>
            <Head title="Scan" />
            <PageBody className="max-w-2xl">
                <PageHeader
                    title="Scan a bag tag"
                    description="Point the scanner at the QR code, or type the order number."
                />

                <Card>
                    <CardContent>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                            className="flex flex-col gap-3 sm:flex-row"
                        >
                            <div className="relative flex-1">
                                <ScanLine className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    value={code}
                                    onChange={(event) =>
                                        setCode(event.target.value)
                                    }
                                    placeholder="Scan or type LND-…"
                                    aria-label="Order number or tag"
                                    autoComplete="off"
                                    className="h-14 pl-13 font-mono text-lg"
                                />
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                className="h-14 text-base"
                            >
                                Open order
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {recent.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <History className="size-4" /> Recent scans on
                                this device
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="divide-y">
                                {recent.map((scan) => (
                                    <li key={scan.orderNumber}>
                                        <Link
                                            href={show(scan.orderNumber)}
                                            className="flex items-center gap-3 py-2.5 text-sm hover:underline"
                                        >
                                            <span className="font-mono font-medium">
                                                {scan.orderNumber}
                                            </span>
                                            <span className="truncate text-muted-foreground">
                                                {scan.customer}
                                            </span>
                                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                                {relative(scan.at)}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </PageBody>
        </>
    );
}

ScanIndex.layout = {
    breadcrumbs: [{ title: 'Scan', href: index() }],
};
