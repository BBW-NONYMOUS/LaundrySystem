<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use App\Notifications\OrderReceived;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Creates and edits orders. Everything for one order (number, items, totals, schedule,
 * first payment, history) is written in a single transaction so a failure never leaves
 * half an order behind.
 */
class OrderService
{
    public function __construct(
        private OrderNumberGenerator $numbers,
        private PricingService $pricing,
        private PaymentService $payments,
    ) {}

    /**
     * @param  array<string, mixed>  $data  Validated StoreOrderRequest data
     */
    public function create(array $data, User $actor): Order
    {
        $order = DB::transaction(function () use ($data, $actor) {
            $customer = $this->resolveCustomer($data);

            /** @var array<int|string, array{service_id: int, quantity: float, piece_count?: int|null, notes?: string|null}> $items */
            $items = $data['items'] ?? [];
            $pickup = $data['pickup'] ?? null;
            $delivery = $data['delivery'] ?? null;
            $isExpress = (bool) ($data['is_express'] ?? false);

            // A booked pickup isn't in the shop yet: it starts as Pending and the clock starts on arrival.
            $status = $pickup !== null ? OrderStatus::Pending : OrderStatus::Received;
            $receivedAt = $status === OrderStatus::Received ? CarbonImmutable::now() : null;

            if ($status === OrderStatus::Received && $items === []) {
                throw ValidationException::withMessages(['items' => 'Add at least one item.']);
            }

            $trips = ($pickup !== null ? 1 : 0) + ($delivery !== null ? 1 : 0);
            $quote = $this->pricing->quote(
                items: $items,
                express: $isExpress,
                deliveryFee: $trips * $this->pricing->deliveryFeePerTrip(),
                discount: (float) ($data['discount_amount'] ?? 0),
                receivedAt: $receivedAt,
            );

            $order = Order::query()->create([
                'order_number' => $this->numbers->next(),
                'tracking_code' => Order::generateTrackingCode(),
                'customer_id' => $customer->id,
                'created_by' => $actor->id,
                'status' => $status,
                'is_express' => $isExpress,
                ...$quote->totals->toOrderAttributes(),
                'discount_reason' => $data['discount_reason'] ?? null,
                'special_instructions' => $data['special_instructions'] ?? null,
                'received_at' => $receivedAt,
                'due_at' => $quote->dueAt,
            ]);

            $order->items()->createMany($quote->lines);

            OrderStatusHistory::query()->create([
                'order_id' => $order->id,
                'to_status' => $status,
                'changed_by' => $actor->id,
                'created_at' => now(),
            ]);

            if ($pickup !== null) {
                $this->createTrip($order, DeliveryType::Pickup, $pickup, $customer);
            }

            if ($delivery !== null) {
                $this->createTrip($order, DeliveryType::Delivery, $delivery, $customer);
            }

            if (! empty($data['payment']['amount'])) {
                $this->payments->record(
                    order: $order,
                    method: PaymentMethod::from($data['payment']['method']),
                    amount: (float) $data['payment']['amount'],
                    receivedBy: $actor,
                    tendered: isset($data['payment']['amount_tendered']) ? (float) $data['payment']['amount_tendered'] : null,
                    reference: $data['payment']['reference_number'] ?? null,
                );
            }

            if ($status === OrderStatus::Received) {
                $customer->notify(new OrderReceived($order));
            }

            return $order;
        });

        return $order->refresh();
    }

    /**
     * Edit items, express, discount and instructions. Only allowed before washing starts.
     *
     * @param  array<string, mixed>  $data  Validated UpdateOrderRequest data
     */
    public function update(Order $order, array $data): Order
    {
        if (! in_array($order->status, [OrderStatus::Pending, OrderStatus::Received], true)) {
            throw ValidationException::withMessages([
                'order' => 'Orders can only be edited before washing starts.',
            ]);
        }

        return DB::transaction(function () use ($order, $data) {
            /** @var array<int|string, array{service_id: int, quantity: float, piece_count?: int|null, notes?: string|null}> $items */
            $items = $data['items'] ?? [];
            $isExpress = (bool) ($data['is_express'] ?? false);

            if ($order->status === OrderStatus::Received && $items === []) {
                throw ValidationException::withMessages(['items' => 'Add at least one item.']);
            }

            $quote = $this->pricing->quote(
                items: $items,
                express: $isExpress,
                deliveryFee: (float) $order->delivery_fee,
                discount: (float) ($data['discount_amount'] ?? 0),
                receivedAt: $order->received_at,
            );

            // Lowering the total below what was already paid would create an overpayment.
            if ($quote->totals->total + 0.001 < (float) $order->amount_paid) {
                throw ValidationException::withMessages([
                    'items' => 'The new total is lower than the amount already paid. Void a payment first.',
                ]);
            }

            $order->items()->delete();
            $order->items()->createMany($quote->lines);

            $order->fill([
                'is_express' => $isExpress,
                ...$quote->totals->toOrderAttributes(),
                'discount_reason' => ($data['discount_amount'] ?? 0) > 0 ? ($data['discount_reason'] ?? null) : null,
                'special_instructions' => $data['special_instructions'] ?? null,
                'due_at' => $quote->dueAt ?? $order->due_at,
            ]);
            $order->refreshPaymentStatus(save: false);
            $order->save();

            return $order->refresh();
        });
    }

    /**
     * Use the selected customer, or quick-add one from the New Order form.
     * If the phone already belongs to a customer, reuse it instead of creating a duplicate.
     *
     * @param  array<string, mixed>  $data
     */
    private function resolveCustomer(array $data): Customer
    {
        if (! empty($data['customer_id'])) {
            return Customer::query()->findOrFail((int) $data['customer_id']);
        }

        /** @var array{name: string, phone: string, email?: string|null, address?: string|null} $new */
        $new = $data['customer'];

        return Customer::query()->firstOrCreate(
            ['phone' => Customer::normalizePhone($new['phone'])],
            Arr::only($new, ['name', 'email', 'address']),
        );
    }

    /**
     * @param  array{scheduled_at: string, address?: string|null, contact_phone?: string|null, rider_id?: int|null}  $trip
     */
    private function createTrip(Order $order, DeliveryType $type, array $trip, Customer $customer): void
    {
        $order->deliveries()->create([
            'type' => $type,
            'status' => DeliveryStatus::Scheduled,
            'scheduled_at' => $trip['scheduled_at'],
            'address' => $trip['address'] ?? $customer->address ?? '',
            'contact_phone' => $trip['contact_phone'] ?? $customer->phone,
            'rider_id' => $trip['rider_id'] ?? null,
            'assigned_by' => isset($trip['rider_id']) ? $order->created_by : null,
        ]);
    }
}
