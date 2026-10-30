<?php

namespace App\Services;

use App\Data\OrderQuote;
use App\Data\OrderTotals;
use App\Models\OrderItem;
use App\Models\Service;
use App\Models\Setting;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Prices order items, applies the minimum quantity, express surcharge, delivery fee
 * and discount, and computes the due date. The server always recomputes totals —
 * amounts sent by the browser are never trusted.
 */
class PricingService
{
    /**
     * Keys are kept as sent by the form so errors point at the right row ("items.3.service_id").
     *
     * @param  array<int|string, array{service_id: int|string, quantity: int|float|string, piece_count?: int|string|null, notes?: string|null}>  $items
     */
    public function quote(
        array $items,
        bool $express,
        float $deliveryFee = 0,
        float $discount = 0,
        ?CarbonInterface $receivedAt = null,
    ): OrderQuote {
        $services = $this->loadServices($items);

        if ($express) {
            $this->ensureExpressAvailable($services);
        }

        $lines = [];

        foreach ($items as $index => $item) {
            $service = $services->get((int) $item['service_id']);

            if ($service === null || ! $service->is_active) {
                throw ValidationException::withMessages([
                    "items.{$index}.service_id" => 'This service is no longer available.',
                ]);
            }

            $lines[] = [
                ...OrderItem::snapshotFor($service, (float) $item['quantity']),
                'piece_count' => isset($item['piece_count']) && $item['piece_count'] !== '' ? (int) $item['piece_count'] : null,
                'notes' => $item['notes'] ?? null,
            ];
        }

        $subtotal = array_sum(array_column($lines, 'line_total'));
        $totals = OrderTotals::compute($subtotal, $express, $this->expressSurchargePercent(), $deliveryFee, $discount);

        if ($discount > $subtotal + $totals->expressFee) {
            throw ValidationException::withMessages([
                'discount_amount' => 'The discount cannot be larger than the laundry charges.',
            ]);
        }

        return new OrderQuote($lines, $totals, $this->dueDate($services, $express, $receivedAt));
    }

    /**
     * Due date = received time + the slowest service's turnaround (express turnaround if rushed).
     *
     * @param  Collection<int, Service>  $services
     */
    public function dueDate(Collection $services, bool $express, ?CarbonInterface $receivedAt): ?CarbonImmutable
    {
        if ($receivedAt === null || $services->isEmpty()) {
            return null;
        }

        $hours = $services->max(fn (Service $service) => $service->turnaroundHours($express));

        return CarbonImmutable::instance($receivedAt)->addHours((int) $hours);
    }

    public function expressSurchargePercent(): float
    {
        return Setting::float('express_surcharge_percent');
    }

    public function deliveryFeePerTrip(): float
    {
        return Setting::float('default_delivery_fee');
    }

    /**
     * Change returned for a cash payment.
     */
    public static function change(float $amount, ?float $tendered): float
    {
        return $tendered === null ? 0.0 : max(round($tendered - $amount, 2), 0.0);
    }

    /**
     * @param  Collection<int, Service>  $services
     */
    private function ensureExpressAvailable(Collection $services): void
    {
        $withoutExpress = $services->reject(fn (Service $service) => $service->offersExpress());

        if ($withoutExpress->isNotEmpty()) {
            throw ValidationException::withMessages([
                'is_express' => 'Express service is not available for: '.$withoutExpress->pluck('name')->implode(', ').'.',
            ]);
        }
    }

    /**
     * @param  array<int|string, array{service_id: int|string, quantity: int|float|string, piece_count?: int|string|null, notes?: string|null}>  $items
     * @return Collection<int, Service>
     */
    private function loadServices(array $items): Collection
    {
        $ids = array_unique(array_map(fn (array $item) => (int) $item['service_id'], $items));

        return Service::query()->whereIn('id', $ids)->get()->keyBy('id');
    }
}
