import { Head, usePoll } from '@inertiajs/react';
import { CircleCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { TripCard } from '@/components/rider/trip-card';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { money } from '@/lib/format';
import type { Delivery, PaymentMethodOption } from '@/types/models';

type Props = {
    pending: Delivery[];
    completedToday: Delivery[];
    paymentMethods: PaymentMethodOption[];
};

/**
 * The rider's phone screen: today's trips with Start / Done / Failed.
 */
export default function MyTrips({
    pending,
    completedToday,
    paymentMethods,
}: Props) {
    const [tab, setTab] = useState<'todo' | 'done'>('todo');
    // New assignments from the counter show up without a refresh; paused while a drawer is open.
    const poll = usePoll(15_000, { only: ['pending', 'completedToday'] });

    const toCollect = pending
        .filter((trip) => trip.type === 'delivery')
        .reduce((sum, trip) => sum + Math.max(trip.order?.balance ?? 0, 0), 0);
    const trips = tab === 'todo' ? pending : completedToday;

    return (
        <>
            <Head title="My trips" />
            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Today · {pending.length}{' '}
                            {pending.length === 1 ? 'trip' : 'trips'}
                        </h1>
                        {toCollect > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Cash to collect:{' '}
                                <span className="font-semibold text-foreground tabular-nums">
                                    {money(toCollect)}
                                </span>
                            </p>
                        )}
                    </div>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={tab}
                        onValueChange={(value) =>
                            value && setTab(value as 'todo' | 'done')
                        }
                    >
                        <ToggleGroupItem value="todo" className="h-10 px-4">
                            To do
                        </ToggleGroupItem>
                        <ToggleGroupItem value="done" className="h-10 px-4">
                            Done ({completedToday.length})
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {trips.length === 0 ? (
                    <Card>
                        {tab === 'todo' ? (
                            <EmptyState
                                icon={Truck}
                                title="No trips assigned"
                                description="New pickups and deliveries from the counter appear here automatically."
                            />
                        ) : (
                            <EmptyState
                                icon={CircleCheck}
                                title="Nothing finished yet today"
                                description="Completed and failed trips are listed here."
                            />
                        )}
                    </Card>
                ) : (
                    trips.map((trip) => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            methods={paymentMethods}
                            onDrawerChange={(open) =>
                                open ? poll.stop() : poll.start()
                            }
                        />
                    ))
                )}
            </div>
        </>
    );
}
