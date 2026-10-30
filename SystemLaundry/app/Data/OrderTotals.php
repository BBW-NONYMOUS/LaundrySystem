<?php

namespace App\Data;

/**
 * The single place where an order's money math lives.
 * Used by PricingService (new orders / quotes) and Order::recalculateTotals() (edits).
 */
final readonly class OrderTotals
{
    public function __construct(
        public float $subtotal,
        public float $expressFee,
        public float $deliveryFee,
        public float $discount,
        public float $total,
    ) {}

    public static function compute(float $subtotal, bool $express, float $expressSurchargePercent, float $deliveryFee, float $discount): self
    {
        $subtotal = round($subtotal, 2);
        $expressFee = $express ? round($subtotal * $expressSurchargePercent / 100, 2) : 0.0;
        $total = max(round($subtotal + $expressFee + $deliveryFee - $discount, 2), 0.0);

        return new self($subtotal, $expressFee, round($deliveryFee, 2), round($discount, 2), $total);
    }

    /**
     * @return array{subtotal: float, express_fee: float, delivery_fee: float, discount_amount: float, total_amount: float}
     */
    public function toOrderAttributes(): array
    {
        return [
            'subtotal' => $this->subtotal,
            'express_fee' => $this->expressFee,
            'delivery_fee' => $this->deliveryFee,
            'discount_amount' => $this->discount,
            'total_amount' => $this->total,
        ];
    }
}
