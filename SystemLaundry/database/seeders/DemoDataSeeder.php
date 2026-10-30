<?php

namespace Database\Seeders;

use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderSequence;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Simulates ~60 days of shop activity so dashboards, reports and monitoring pages have
 * realistic data: peak hours, express orders, partial payments, deliveries, overdue and
 * unclaimed laundry, and cancellations. Every order follows the OrderStatus state machine.
 *
 * @phpstan-type TimelineEvent array{status: OrderStatus, at: CarbonImmutable, by: int, notes?: string, rider?: int}
 */
class DemoDataSeeder extends Seeder
{
    private const DAYS = 60;

    /**
     * Relative weight of walk-ins per opening hour (7 AM - 7 PM); peaks before and after work.
     *
     * @var array<int, int>
     */
    private const HOUR_WEIGHTS = [7 => 1, 8 => 4, 9 => 5, 10 => 3, 11 => 2, 12 => 2, 13 => 2, 14 => 2, 15 => 2, 16 => 3, 17 => 5, 18 => 4, 19 => 2];

    /**
     * Services that skip washing/drying/folding and go straight to Ready.
     */
    private const NON_WASH_CODES = ['IRN', 'DC', 'SHOE'];

    /** Delivery slots offered to customers. */
    private const DELIVERY_HOURS = [9, 13, 16];

    private CarbonImmutable $now;

    /** @var \Illuminate\Support\Collection<string, Service> */
    private \Illuminate\Support\Collection $services;

    /** @var Collection<int, Customer> */
    private Collection $customers;

    /** @var Collection<int, Customer> */
    private Collection $regulars;

    /** @var Collection<int, User> */
    private Collection $cashiers;

    /** @var Collection<int, User> */
    private Collection $staff;

    /** @var Collection<int, User> */
    private Collection $riders;

    private User $admin;

    private float $expressPercent;

    private float $deliveryFee;

    private int $unclaimedDays;

    private int $reminderInterval;

    /** @var array<string, int> Y-m-d => last number used */
    private array $sequences = [];

    public function run(): void
    {
        // Fixed seeds so every `migrate:fresh --seed` produces the same demo data.
        mt_srand(2026);
        fake()->seed(2026);

        $this->now = CarbonImmutable::now();
        $this->services = Service::all()->keyBy('code');
        $this->admin = User::role(UserRole::Admin->value)->firstOrFail();
        $this->cashiers = User::role(UserRole::Cashier->value)->where('is_active', true)->get();
        $this->staff = User::role(UserRole::Staff->value)->where('is_active', true)->get();
        $this->riders = User::role(UserRole::Rider->value)->where('is_active', true)->get();
        $this->expressPercent = Setting::float('express_surcharge_percent');
        $this->deliveryFee = Setting::float('default_delivery_fee');
        $this->unclaimedDays = Setting::int('unclaimed_after_days');
        $this->reminderInterval = max(Setting::int('reminder_interval_days'), 1);

        // One transaction: thousands of inserts commit at once instead of one disk flush each.
        DB::transaction(function () {
            $this->seedCustomers();

            for ($daysAgo = self::DAYS; $daysAgo >= 0; $daysAgo--) {
                foreach ($this->walkInTimesFor($this->now->startOfDay()->subDays($daysAgo)) as $receivedAt) {
                    if ($receivedAt->lessThan($this->now)) {
                        $this->createOrder($receivedAt);
                    }
                }
            }

            $this->createUpcomingPickups();
            $this->saveSequences();
            $this->logSampleActivity();
        });
    }

    private function seedCustomers(): void
    {
        $this->customers = Customer::factory()->count(80)->create();

        // The demo portal account gets a customer profile and is a regular.
        $portalUser = User::where('email', 'customer@laundry.test')->first();

        if ($portalUser !== null) {
            $this->customers->push(Customer::factory()->create([
                'user_id' => $portalUser->id,
                'name' => $portalUser->name,
                'phone' => $portalUser->phone,
                'email' => $portalUser->email,
            ]));
        }

        // ~15 regulars bring almost half of all orders, which makes "top customers" meaningful.
        $this->regulars = $this->customers->random(15)->push($this->customers->last());
    }

    /**
     * @return list<CarbonImmutable>
     */
    private function walkInTimesFor(CarbonImmutable $date): array
    {
        $count = $date->isWeekend() ? mt_rand(12, 18) : mt_rand(7, 12);
        $times = [];

        for ($i = 0; $i < $count; $i++) {
            $times[] = $date->setTime($this->weightedHour(), mt_rand(0, 59), mt_rand(0, 59));
        }

        sort($times);

        return $times;
    }

    private function weightedHour(): int
    {
        $roll = mt_rand(1, array_sum(self::HOUR_WEIGHTS));

        foreach (self::HOUR_WEIGHTS as $hour => $weight) {
            $roll -= $weight;

            if ($roll <= 0) {
                return $hour;
            }
        }

        return 9;
    }

    private function createOrder(CarbonImmutable $receivedAt): void
    {
        $customer = $this->chance(45) ? $this->regulars->random() : $this->customers->random();
        $cashier = $this->cashiers->random();
        $items = $this->pickItems();
        $isPickup = $this->chance(10);
        $isDelivery = $this->chance(25);
        $isExpress = $this->chance(12) && collect($items)->every(fn ($item) => $item['service']->offersExpress());
        $bookedAt = $isPickup ? $this->bookingTimeFor($receivedAt) : $receivedAt;

        $turnaround = collect($items)->max(fn ($item) => $item['service']->turnaroundHours($isExpress));
        $dueAt = $receivedAt->addHours($turnaround);

        $order = new Order;
        $order->forceFill([
            'order_number' => $this->nextOrderNumber($bookedAt),
            'tracking_code' => Order::generateTrackingCode(),
            'customer_id' => $customer->id,
            'created_by' => $cashier->id,
            'status' => OrderStatus::Received,
            'is_express' => $isExpress,
            'delivery_fee' => ($isPickup ? $this->deliveryFee : 0) + ($isDelivery ? $this->deliveryFee : 0),
            'special_instructions' => $this->chance(20) ? fake()->randomElement([
                'Do not use bleach', 'Separate white clothes', 'Fold, do not hang', 'Unscented softener only', 'Handle with care - delicate fabric',
            ]) : null,
            'received_at' => $receivedAt,
            'due_at' => $dueAt,
            'created_at' => $bookedAt,
            'updated_at' => $bookedAt,
        ])->save();

        foreach ($items as $item) {
            $order->items()->forceCreate([
                ...OrderItem::snapshotFor($item['service'], $item['quantity']),
                'piece_count' => $item['pieces'],
                'created_at' => $bookedAt,
                'updated_at' => $bookedAt,
            ]);
        }

        // Occasional senior citizen / PWD or loyalty discount, applied before totals are computed.
        if ($this->chance(6)) {
            $subtotal = collect($items)->sum(fn ($item) => $item['service']->lineTotal($item['quantity']));
            [$rate, $reason] = fake()->randomElement([[0.20, 'Senior Citizen / PWD discount'], [0.10, 'Loyalty card - 10th visit']]);
            $order->forceFill(['discount_amount' => round($subtotal * $rate, 2), 'discount_reason' => $reason]);
        }

        $order->recalculateTotals($this->expressPercent);

        $events = $this->buildTimeline($isPickup, $isDelivery, $bookedAt, $receivedAt, $dueAt, $items, $cashier);
        // The first event (booking or drop-off) is always in the past; later ones may still be upcoming.
        [$first, $rest] = [$events[0], array_slice($events, 1)];
        $reached = [$first, ...array_filter($rest, fn ($event) => $event['at']->lessThanOrEqualTo($this->now))];

        $this->writeHistory($order, $reached);
        $this->writeDeliveries($order, $customer, $isPickup, $isDelivery, $events, $reached);
        $this->writePayments($order, $reached, $cashier);
        $this->finalizeOrder($order, $reached);
    }

    /**
     * @return list<array{service: Service, quantity: float, pieces: int|null}>
     */
    private function pickItems(): array
    {
        // A few orders are special-care only (dry cleaning, shoes, ironing).
        if ($this->chance(5)) {
            $code = fake()->randomElement(['DC', 'SHOE', 'IRN']);

            return [$this->item($code, $code === 'IRN' ? mt_rand(5, 15) : mt_rand(1, 3))];
        }

        $roll = mt_rand(1, 100);
        $main = match (true) {
            $roll <= 78 => $this->item('WDF', fake()->randomFloat(1, 2.0, 9.5), mt_rand(10, 45)),
            $roll <= 86 => $this->item('WO', fake()->randomFloat(1, 3.0, 8.0), mt_rand(10, 35)),
            $roll <= 91 => $this->item('WDP', fake()->randomFloat(1, 2.0, 6.0), mt_rand(8, 25)),
            default => $this->item('BED', fake()->randomFloat(1, 2.0, 5.0), mt_rand(4, 12)),
        };

        $items = [$main];

        if ($this->chance(20)) {
            $items[] = match (mt_rand(1, 3)) {
                1 => $this->item('COMF', mt_rand(1, 2)),
                2 => $this->item('IRN', mt_rand(3, 10)),
                default => $this->item('CURT', fake()->randomFloat(1, 2.0, 5.0)),
            };
        }

        return $items;
    }

    /**
     * @return array{service: Service, quantity: float, pieces: int|null}
     */
    private function item(string $code, float $quantity, ?int $pieces = null): array
    {
        return ['service' => $this->services[$code], 'quantity' => $quantity, 'pieces' => $pieces];
    }

    /**
     * Every status change the order will go through, including ones still in the future.
     *
     * @param  list<array{service: Service, quantity: float, pieces: int|null}>  $items
     * @return non-empty-list<TimelineEvent>
     */
    private function buildTimeline(bool $isPickup, bool $isDelivery, CarbonImmutable $bookedAt, CarbonImmutable $receivedAt, CarbonImmutable $dueAt, array $items, User $cashier): array
    {
        $events = [];

        if ($isPickup) {
            $events[] = ['status' => OrderStatus::Pending, 'at' => $bookedAt, 'by' => $cashier->id];
        }

        $events[] = ['status' => OrderStatus::Received, 'at' => $receivedAt, 'by' => $cashier->id];

        // ~3% of older orders get cancelled shortly after drop-off.
        if ($this->chance(3) && $receivedAt->lessThan($this->now->subDay())) {
            $events[] = [
                'status' => OrderStatus::Cancelled,
                'at' => $receivedAt->addMinutes(mt_rand(10, 120)),
                'by' => $cashier->id,
                'notes' => fake()->randomElement(['Customer changed mind', 'Duplicate entry', 'Customer will wash at home']),
            ];

            return $events;
        }

        $span = $dueAt->diffInMinutes($receivedAt, true);
        // Some orders get stuck (machine breakdown, backlog) and run past their due time.
        // A current backlog keeps ~1/3 of 1-3 day old orders waiting, so the overdue page has data.
        $ageInHours = $receivedAt->diffInHours($this->now, true);
        $delay = match (true) {
            $ageInHours >= 25 && $ageInHours <= 72 && $this->chance(35) => 72 * 60,
            $this->chance(8) => mt_rand(30, 60) * 60,
            default => 0,
        };
        $nonWash = collect($items)->every(fn ($item) => in_array($item['service']->code, self::NON_WASH_CODES, true));

        if ($nonWash) {
            $readyAt = $this->duringShopHours($receivedAt->addMinutes((int) ($span * fake()->randomFloat(2, 0.4, 0.85)) + $delay));
        } else {
            $washingAt = $this->duringShopHours($receivedAt->addMinutes((int) ($span * fake()->randomFloat(2, 0.05, 0.4)) + $delay));
            $dryingAt = $this->duringShopHours($washingAt->addMinutes(mt_rand(45, 75)));
            $foldingAt = $this->duringShopHours($dryingAt->addMinutes(mt_rand(50, 80)));
            $readyAt = $this->duringShopHours($foldingAt->addMinutes(mt_rand(30, 60)));

            $events[] = ['status' => OrderStatus::Washing, 'at' => $washingAt, 'by' => $this->staff->random()->id];
            $events[] = ['status' => OrderStatus::Drying, 'at' => $dryingAt, 'by' => $this->staff->random()->id];
            $events[] = ['status' => OrderStatus::Folding, 'at' => $foldingAt, 'by' => $this->staff->random()->id];
        }

        $events[] = ['status' => OrderStatus::Ready, 'at' => $readyAt, 'by' => $this->staff->random()->id];

        if ($isDelivery) {
            $rider = $this->riders->random();
            $outAt = $this->nextDeliverySlot($readyAt);

            // ~6% of deliveries fail the first time (customer not home) and are retried next slot.
            if ($this->chance(6)) {
                $failedAt = $outAt->addMinutes(mt_rand(30, 90));
                $events[] = ['status' => OrderStatus::OutForDelivery, 'at' => $outAt, 'by' => $cashier->id, 'rider' => $rider->id];
                $events[] = ['status' => OrderStatus::Ready, 'at' => $failedAt, 'by' => $rider->id, 'notes' => 'Delivery failed: customer not home'];
                $outAt = $this->nextDeliverySlot($failedAt->addHours(2));
            }

            $events[] = ['status' => OrderStatus::OutForDelivery, 'at' => $outAt, 'by' => $cashier->id, 'rider' => $rider->id];
            $events[] = ['status' => OrderStatus::Delivered, 'at' => $outAt->addMinutes(mt_rand(20, 90)), 'by' => $rider->id, 'rider' => $rider->id];
        } else {
            // Most customers claim within 3 days; ~8% leave laundry unclaimed for weeks.
            $claimAt = $this->chance(8)
                ? $readyAt->addDays(mt_rand(9, 30))
                : $readyAt->addMinutes(mt_rand(60, 72 * 60));
            $claimAt = $claimAt->setTime(max(8, min(19, $claimAt->hour)), $claimAt->minute);

            $events[] = ['status' => OrderStatus::Completed, 'at' => $claimAt->max($readyAt->addMinutes(30)), 'by' => $this->cashiers->random()->id];
        }

        return $events;
    }

    /**
     * Pickups are booked by phone a few hours before collection, or the evening before for early pickups.
     */
    private function bookingTimeFor(CarbonImmutable $receivedAt): CarbonImmutable
    {
        $bookedAt = $receivedAt->subHours(mt_rand(2, 5));

        return $bookedAt->hour < 7
            ? $receivedAt->subDay()->setTime(mt_rand(17, 19), mt_rand(0, 59))
            : $bookedAt;
    }

    /**
     * Staff only work 7 AM - 8 PM: work that would fall outside is pushed to the next opening.
     */
    private function duringShopHours(CarbonImmutable $at): CarbonImmutable
    {
        return match (true) {
            $at->hour < 7 => $at->setTime(7, mt_rand(0, 45)),
            $at->hour >= 20 => $at->addDay()->setTime(7, mt_rand(0, 45)),
            default => $at,
        };
    }

    private function nextDeliverySlot(CarbonImmutable $after): CarbonImmutable
    {
        $day = $after->startOfDay();

        for ($i = 0; $i < 3; $i++) {
            foreach (self::DELIVERY_HOURS as $hour) {
                $slot = $day->addDays($i)->setTime($hour, 0);

                if ($slot->greaterThan($after->addMinutes(30))) {
                    return $slot;
                }
            }
        }

        return $after->addDay()->setTime(self::DELIVERY_HOURS[0], 0);
    }

    /**
     * @param  non-empty-list<TimelineEvent>  $reached
     */
    private function writeHistory(Order $order, array $reached): void
    {
        $previous = null;

        foreach ($reached as $event) {
            OrderStatusHistory::query()->create([
                'order_id' => $order->id,
                'from_status' => $previous,
                'to_status' => $event['status'],
                'changed_by' => $event['by'],
                'notes' => $event['notes'] ?? null,
                'created_at' => $event['at'],
            ]);

            $previous = $event['status'];
        }
    }

    /**
     * @param  non-empty-list<TimelineEvent>  $events
     * @param  non-empty-list<TimelineEvent>  $reached
     */
    private function writeDeliveries(Order $order, Customer $customer, bool $isPickup, bool $isDelivery, array $events, array $reached): void
    {
        $address = $customer->address ?? 'Walk-in address not provided';

        if ($isPickup) {
            Delivery::query()->forceCreate([
                'order_id' => $order->id,
                'type' => DeliveryType::Pickup,
                'status' => DeliveryStatus::Completed,
                'rider_id' => $this->riders->random()->id,
                'assigned_by' => $order->created_by,
                'scheduled_at' => $order->received_at->subMinutes(30),
                'address' => $address,
                'contact_phone' => $customer->phone,
                'attempts' => 1,
                'completed_at' => $order->received_at,
                'created_at' => $order->created_at,
                'updated_at' => $order->received_at,
            ]);
        }

        if (! $isDelivery) {
            return;
        }

        $trips = array_values(array_filter($events, fn ($event) => $event['status'] === OrderStatus::OutForDelivery));
        $tripsDone = count(array_filter($reached, fn ($event) => $event['status'] === OrderStatus::OutForDelivery));
        $last = end($reached);
        // A failed first attempt is rescheduled on the same row (attempts stays > 0, reason kept).
        $failed = count($trips) > 1 && $tripsDone >= 1;

        $status = match ($last['status']) {
            OrderStatus::Delivered => DeliveryStatus::Completed,
            OrderStatus::OutForDelivery => DeliveryStatus::InTransit,
            OrderStatus::Cancelled => DeliveryStatus::Cancelled,
            default => DeliveryStatus::Scheduled,
        };

        // The trip this row currently describes: the one on the road/finished, or the next one planned.
        $currentTrip = in_array($status, [DeliveryStatus::InTransit, DeliveryStatus::Completed], true) ? $tripsDone - 1 : $tripsDone;
        $scheduledAt = $trips === []
            ? $order->due_at
            : $trips[min(max($currentTrip, 0), count($trips) - 1)]['at'];

        Delivery::query()->forceCreate([
            'order_id' => $order->id,
            'type' => DeliveryType::Delivery,
            'status' => $status,
            // Riders are assigned the evening before; future trips may still be unassigned.
            'rider_id' => $tripsDone > 0 || $this->chance(60) ? ($trips[0]['rider'] ?? null) : null,
            'assigned_by' => $tripsDone > 0 ? $order->created_by : null,
            'scheduled_at' => $scheduledAt,
            'address' => $address,
            'contact_phone' => $customer->phone,
            'attempts' => $tripsDone,
            'completed_at' => $status === DeliveryStatus::Completed ? $last['at'] : null,
            'failure_reason' => $failed ? 'Customer not home' : null,
            'created_at' => $order->created_at,
            'updated_at' => $last['at'],
        ]);
    }

    /**
     * Payment plans: 55% pay in full at drop-off, 15% pay half up front, 30% pay on release.
     *
     * @param  non-empty-list<TimelineEvent>  $reached
     */
    private function writePayments(Order $order, array $reached, User $cashier): void
    {
        $last = end($reached);

        if ($last['status'] === OrderStatus::Cancelled) {
            return;
        }

        $total = (float) $order->total_amount;
        $released = in_array($last['status'], [OrderStatus::Completed, OrderStatus::Delivered], true);
        // Counter release is recorded by the cashier; a delivery by the rider who collects COD.
        $releasedBy = $last['by'];
        $plan = mt_rand(1, 100);

        $upfront = match (true) {
            $plan <= 55 => $total,
            $plan <= 70 => floor($total / 2 / 10) * 10,
            default => 0.0,
        };

        if ($upfront > 0) {
            $this->pay($order, $upfront, $order->received_at, $cashier->id, atCounter: true);
        }

        $remaining = round($total - $upfront, 2);

        if ($released && $remaining > 0) {
            $this->pay($order, $remaining, $last['at'], $releasedBy, atCounter: $last['status'] === OrderStatus::Completed);
        }

        // ~1% of orders have a mistyped payment that was voided by the owner.
        if ($upfront > 0 && $this->chance(1)) {
            $this->pay($order, $upfront + 100, $order->received_at->subMinute(), $cashier->id, atCounter: true, voided: true);
        }

        $order->refreshPaymentStatus(save: false);
        $order->saveQuietly();
    }

    private function pay(Order $order, float $amount, CarbonInterface $paidAt, int $receivedBy, bool $atCounter, bool $voided = false): void
    {
        $method = $atCounter
            ? fake()->randomElement([...array_fill(0, 13, PaymentMethod::Cash), ...array_fill(0, 5, PaymentMethod::GCash), PaymentMethod::Maya, PaymentMethod::BankTransfer])
            : ($this->chance(80) ? PaymentMethod::Cash : PaymentMethod::GCash);

        Payment::query()->forceCreate([
            'order_id' => $order->id,
            'received_by' => $receivedBy,
            'method' => $method,
            'reference_number' => $method->requiresReference() ? fake()->numerify('#############') : null,
            'amount' => $amount,
            'amount_tendered' => $method === PaymentMethod::Cash ? $this->cashTendered($amount) : null,
            'paid_at' => $paidAt,
            'voided_at' => $voided ? $paidAt->addMinutes(3) : null,
            'voided_by' => $voided ? $this->admin->id : null,
            'void_reason' => $voided ? 'Wrong amount entered' : null,
            'created_at' => $paidAt,
            'updated_at' => $voided ? $paidAt->addMinutes(3) : $paidAt,
        ]);
    }

    /**
     * Customers hand over exact change or the next round bill.
     */
    private function cashTendered(float $amount): float
    {
        $bill = fake()->randomElement([0, 50, 100, 500, 1000]);

        return $bill === 0 ? $amount : max(ceil($amount / $bill) * $bill, $amount);
    }

    /**
     * Copy the final status and milestone timestamps onto the order row.
     *
     * @param  non-empty-list<TimelineEvent>  $reached
     */
    private function finalizeOrder(Order $order, array $reached): void
    {
        $last = end($reached);
        $readyEvents = array_filter($reached, fn ($event) => $event['status'] === OrderStatus::Ready);
        $readyAt = $readyEvents === [] ? null : end($readyEvents)['at'];
        $firstReady = $readyEvents === [] ? null : reset($readyEvents)['at'];

        $attributes = [
            'status' => $last['status'],
            'ready_at' => $firstReady,
            'completed_at' => in_array($last['status'], [OrderStatus::Completed, OrderStatus::Delivered], true) ? $last['at'] : null,
            'cancelled_at' => $last['status'] === OrderStatus::Cancelled ? $last['at'] : null,
            'cancellation_reason' => $last['status'] === OrderStatus::Cancelled ? ($last['notes'] ?? null) : null,
            'updated_at' => $last['at'],
        ];

        // Unclaimed laundry has received reminders every few days after the threshold.
        if ($last['status'] === OrderStatus::Ready && $readyAt !== null) {
            $daysWaiting = (int) $readyAt->diffInDays($this->now, true);

            if ($daysWaiting >= $this->unclaimedDays) {
                $count = intdiv($daysWaiting - $this->unclaimedDays, $this->reminderInterval) + 1;
                $attributes['reminder_count'] = $count;
                $attributes['last_reminded_at'] = $readyAt->addDays($this->unclaimedDays + ($count - 1) * $this->reminderInterval)->setTime(9, 0);
            }
        }

        $order->timestamps = false;
        $order->forceFill($attributes)->saveQuietly();
    }

    /**
     * Pickups booked for today/tomorrow that the riders have not collected yet.
     */
    private function createUpcomingPickups(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $customer = $this->regulars->random();
            $bookedAt = $this->now->subMinutes(mt_rand(30, 600));
            $scheduledAt = $this->nextDeliverySlot($this->now->addHours(mt_rand(1, 24)));
            $cashier = $this->cashiers->random();

            $order = new Order;
            $order->forceFill([
                'order_number' => $this->nextOrderNumber($bookedAt),
                'tracking_code' => Order::generateTrackingCode(),
                'customer_id' => $customer->id,
                'created_by' => $customer->user_id ?? $cashier->id,
                'status' => OrderStatus::Pending,
                'delivery_fee' => $this->deliveryFee,
                'total_amount' => $this->deliveryFee,
                'special_instructions' => 'Booked by phone - weigh on arrival',
                'created_at' => $bookedAt,
                'updated_at' => $bookedAt,
            ])->save();

            OrderStatusHistory::query()->create([
                'order_id' => $order->id,
                'to_status' => OrderStatus::Pending,
                'changed_by' => $order->created_by,
                'created_at' => $bookedAt,
            ]);

            Delivery::query()->forceCreate([
                'order_id' => $order->id,
                'type' => DeliveryType::Pickup,
                'status' => DeliveryStatus::Scheduled,
                'rider_id' => $i < 3 ? $this->riders->random()->id : null,
                'assigned_by' => $i < 3 ? $cashier->id : null,
                'scheduled_at' => $scheduledAt,
                'address' => $customer->address ?? 'Address to follow',
                'contact_phone' => $customer->phone,
                'created_at' => $bookedAt,
                'updated_at' => $bookedAt,
            ]);
        }
    }

    private function chance(int $percent): bool
    {
        return mt_rand(1, 100) <= $percent;
    }

    private function nextOrderNumber(CarbonImmutable $date): string
    {
        $key = $date->toDateString();
        $this->sequences[$key] = ($this->sequences[$key] ?? 0) + 1;

        return sprintf('LND-%s-%04d', $date->format('Ymd'), $this->sequences[$key]);
    }

    /**
     * Keep order_sequences in step so new orders continue after the seeded numbers.
     */
    private function saveSequences(): void
    {
        foreach ($this->sequences as $date => $last) {
            OrderSequence::query()->updateOrCreate(['sequence_date' => $date], ['last_number' => $last]);
        }
    }

    /**
     * A few audit-trail entries so the Activity Log page has something to show.
     */
    private function logSampleActivity(): void
    {
        $wdf = $this->services['WDF'];

        activity('services')
            ->performedOn($wdf)
            ->causedBy($this->admin)
            ->event('updated')
            ->withChanges(['attributes' => ['price' => '35.00'], 'old' => ['price' => '30.00']])
            ->createdAt($this->now->subDays(45)->setTime(7, 15))
            ->log('updated');

        activity('settings')
            ->causedBy($this->admin)
            ->event('updated')
            ->withChanges(['attributes' => ['express_surcharge_percent' => '50'], 'old' => ['express_surcharge_percent' => '40']])
            ->createdAt($this->now->subDays(30)->setTime(18, 40))
            ->log('Updated shop settings');

        $voided = Payment::query()->whereNotNull('voided_at')->first();

        if ($voided !== null) {
            activity('payments')
                ->performedOn($voided)
                ->causedBy($this->admin)
                ->event('updated')
                ->withChanges(['attributes' => ['voided_at' => $voided->voided_at->toDateTimeString(), 'void_reason' => $voided->void_reason], 'old' => ['voided_at' => null, 'void_reason' => null]])
                ->createdAt($voided->voided_at)
                ->log('Voided payment');
        }
    }
}
