import { Head } from '@inertiajs/react';
import { addDays, format, isToday, parseISO } from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Inbox,
    TriangleAlert,
    Truck,
    UserRound,
} from 'lucide-react';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { DatePicker } from '@/components/date-picker';
import { TripCard } from '@/components/deliveries/trip-card';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { isoDate } from '@/lib/format';
import { index } from '@/routes/deliveries';
import type {
    Delivery,
    DeliveryStatus,
    DeliveryType,
    Option,
    TableFilters,
    UserSummary,
} from '@/types/models';

type Props = {
    date: string;
    deliveries: Delivery[];
    overdueTrips: Delivery[];
    riders: UserSummary[];
    filters: TableFilters;
    options: {
        types: Option<DeliveryType>[];
        statuses: Option<DeliveryStatus>[];
    };
};

/**
 * Counter's scheduling board for one day: unassigned trips on the left,
 * each rider's run on the right.
 */
export default function DeliveriesIndex({
    date,
    deliveries,
    overdueTrips,
    riders,
    filters,
    options,
}: Props) {
    const { setParams } = useTableQuery();
    const isMobile = useIsMobile();
    const day = parseISO(date);

    const goTo = (target: Date) =>
        setParams({ date: isToday(target) ? null : isoDate(target) });

    const unassigned = deliveries.filter((trip) => !trip.rider);
    // Riders on the active list, plus anyone (e.g. since deactivated) who still has trips today.
    const riderIds = new Set(riders.map((rider) => rider.id));
    const extraRiders = deliveries
        .map((trip) => trip.rider)
        .filter(
            (rider): rider is UserSummary => !!rider && !riderIds.has(rider.id),
        )
        .filter(
            (rider, position, list) =>
                list.findIndex((other) => other.id === rider.id) === position,
        );
    const riderColumns = [...riders, ...extraRiders].map((rider) => ({
        rider,
        trips: deliveries.filter((trip) => trip.rider?.id === rider.id),
    }));

    return (
        <>
            <Head title="Deliveries" />
            <PageBody>
                <PageHeader
                    title="Pickups & deliveries"
                    description={format(day, 'EEEE, MMMM d, yyyy')}
                >
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => goTo(addDays(day, -1))}
                            aria-label="Previous day"
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => goTo(new Date())}
                            disabled={isToday(day)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => goTo(addDays(day, 1))}
                            aria-label="Next day"
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                    <DatePicker
                        value={date}
                        onChange={(value) => goTo(parseISO(value))}
                        className="w-auto"
                    />
                </PageHeader>

                {overdueTrips.length > 0 && (
                    <Alert variant="destructive">
                        <TriangleAlert />
                        <AlertTitle>
                            {overdueTrips.length}{' '}
                            {overdueTrips.length === 1 ? 'trip' : 'trips'} from
                            earlier days still not done
                        </AlertTitle>
                        <AlertDescription>
                            <div className="mt-2 grid w-full gap-2 md:grid-cols-2">
                                {overdueTrips.map((trip) => (
                                    <TripCard
                                        key={trip.id}
                                        trip={trip}
                                        riders={riders}
                                        showDate
                                    />
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Tabs
                        value={String(filters.type ?? 'all')}
                        onValueChange={(value) =>
                            setParams({ type: value === 'all' ? null : value })
                        }
                    >
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            {options.types.map((type) => (
                                <TabsTrigger
                                    key={type.value}
                                    value={type.value}
                                >
                                    {type.label === 'Pickup'
                                        ? 'Pickups'
                                        : 'Deliveries'}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="tabular-nums">
                            {deliveries.length}{' '}
                            {deliveries.length === 1 ? 'trip' : 'trips'}
                        </Badge>
                        <Select
                            value={String(filters.status ?? 'all')}
                            onValueChange={(value) =>
                                setParams({
                                    status: value === 'all' ? null : value,
                                })
                            }
                        >
                            <SelectTrigger
                                size="sm"
                                className="w-40"
                                aria-label="Filter by status"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any status</SelectItem>
                                {options.statuses.map((status) => (
                                    <SelectItem
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {deliveries.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={Truck}
                            title="No trips on this day"
                            description="Pickups and deliveries scheduled from orders appear here."
                        />
                    </Card>
                ) : (
                    <ResizablePanelGroup
                        orientation={isMobile ? 'vertical' : 'horizontal'}
                        className={
                            isMobile
                                ? 'min-h-[80svh] rounded-lg border'
                                : 'min-h-[520px] rounded-lg border'
                        }
                    >
                        <ResizablePanel defaultSize="38" minSize="25">
                            <section className="flex h-full flex-col">
                                <header className="flex items-center justify-between border-b px-4 py-3">
                                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                                        <Inbox className="size-4" />
                                        Unassigned
                                    </h2>
                                    <Badge
                                        variant={
                                            unassigned.length > 0
                                                ? 'destructive'
                                                : 'secondary'
                                        }
                                        className="tabular-nums"
                                    >
                                        {unassigned.length}
                                    </Badge>
                                </header>
                                <div className="grid flex-1 content-start gap-2 overflow-y-auto p-3">
                                    {unassigned.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            Every trip has a rider.
                                        </p>
                                    ) : (
                                        unassigned.map((trip) => (
                                            <TripCard
                                                key={trip.id}
                                                trip={trip}
                                                riders={riders}
                                            />
                                        ))
                                    )}
                                </div>
                            </section>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize="62" minSize="30">
                            <div className="grid h-full content-start gap-3 overflow-y-auto p-3 xl:grid-cols-2">
                                {riderColumns.length === 0 && (
                                    <p className="py-6 text-center text-sm text-muted-foreground xl:col-span-2">
                                        No active riders. Add one under Users.
                                    </p>
                                )}
                                {riderColumns.map(({ rider, trips }) => (
                                    <Card key={rider.id} className="gap-3 py-4">
                                        <CardHeader className="px-4">
                                            <CardTitle className="flex items-center gap-2 text-sm">
                                                <UserRound className="size-4" />
                                                {rider.name}
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-auto tabular-nums"
                                                >
                                                    {trips.length}
                                                </Badge>
                                            </CardTitle>
                                            {rider.phone && (
                                                <a
                                                    href={`tel:${rider.phone}`}
                                                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    {rider.phone}
                                                </a>
                                            )}
                                        </CardHeader>
                                        <CardContent className="grid gap-2 px-4">
                                            {trips.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    No trips assigned.
                                                </p>
                                            ) : (
                                                trips.map((trip) => (
                                                    <TripCard
                                                        key={trip.id}
                                                        trip={trip}
                                                        riders={riders}
                                                    />
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
            </PageBody>
        </>
    );
}

DeliveriesIndex.layout = {
    breadcrumbs: [{ title: 'Deliveries', href: index() }],
};
